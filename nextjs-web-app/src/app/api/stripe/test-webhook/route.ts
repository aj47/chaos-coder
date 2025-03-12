import { AuthService } from "@/lib/auth";
import { addUserCredits } from "@/lib/db-helpers";
import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { PaymentService } from "@/lib/payment";

// Test function to simulate a webhook for testing purposes only
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const userId = searchParams.get("userId");
  const tier = searchParams.get("tier") || "pro";
  
  try {
    // Create an admin client to access the database
    const supabase = await AuthService.createAdminClient();
    
    // Test the admin client - default action
    if (!action || action === "test-admin") {
      const { data, error } = await supabase.from("profiles").select("*").limit(1);
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      return NextResponse.json({ status: "success", message: "Admin client works!", data });
    }
    
    // Test the upgrade flow and credit grant
    if (action === "test-upgrade") {
      // We need a userId for this action
      if (!userId) {
        return NextResponse.json(
          { error: "userId is required for test-upgrade action" },
          { status: 400 }
        );
      }
      
      // Get the user's profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (profileError) {
        return NextResponse.json(
          { error: `Error fetching profile: ${profileError.message}` },
          { status: 500 }
        );
      }
      
      // Check if the user has already received credits today
      const today = format(new Date(), "yyyy-MM-dd");
      const lastRefreshDate = profileData.last_credit_refresh 
        ? format(new Date(profileData.last_credit_refresh), "yyyy-MM-dd")
        : null;
      
      if (lastRefreshDate === today) {
        return NextResponse.json(
          { 
            error: "User has already received credits today", 
            profile: profileData 
          },
          { status: 400 }
        );
      }
      
      // Simulate an upgrade - determine new tier and credit amount
      const currentTier = profileData.subscription_tier || "free";
      const newTier = currentTier === "free" ? "pro" : 
                     (currentTier === "pro" ? "ultra" : "free");
      
      // Determine credits to add based on the new tier
      let creditsToAdd = 30; // Default for free tier
      if (newTier === "pro") {
        creditsToAdd = 100;
      } else if (newTier === "ultra") {
        creditsToAdd = 1000;
      }
      
      // Call the helper function to grant the credits
      const { error: creditsError } = await addUserCredits(
        supabase,
        userId,
        creditsToAdd,
        'subscription',
        `Daily credits for ${newTier} subscription`
      );
      
      if (creditsError) {
        return NextResponse.json(
          { error: `Error adding credits: ${creditsError.message}` },
          { status: 500 }
        );
      }
      
      // Update the user's profile with the new tier and refresh timestamp
      const now = new Date().toISOString();
      const { data: updatedProfile, error: updateError } = await supabase
        .from("profiles")
        .update({
          subscription_tier: newTier,
          last_credit_refresh: now
        })
        .eq("id", userId)
        .select()
        .single();
      
      if (updateError) {
        return NextResponse.json(
          { error: `Error updating profile: ${updateError.message}` },
          { status: 500 }
        );
      }
      
      // Return before/after data for verification
      return NextResponse.json({
        status: "success",
        message: `Simulated upgrade from ${currentTier} to ${newTier} with ${creditsToAdd} credits`,
        before: profileData,
        after: updatedProfile
      });
    }
    
    // Test subscription change webhook handling
    if (action === "test-subscription-change") {
      // We need a userId for this action
      if (!userId) {
        return NextResponse.json(
          { error: "userId is required for test-subscription-change action" },
          { status: 400 }
        );
      }
      
      // Get the user's profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (profileError) {
        return NextResponse.json(
          { error: `Error fetching profile: ${profileError.message}` },
          { status: 500 }
        );
      }
      
      // Create a mock subscription object that matches what Stripe would send
      // Using type assertion to satisfy the type requirements
      const mockSubscription = {
        id: profileData.stripe_subscription_id || `sub_test_${Date.now()}`,
        customer: profileData.stripe_customer_id || `cus_test_${Date.now()}`,
        status: "active",
        metadata: {
          userId: userId,
          tier: tier
        },
        currency: "usd",
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // +30 days
        
        // Required properties to satisfy Stripe type
        object: "subscription",
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        items: {
          object: "list",
          data: [],
          has_more: false,
          total_count: 0,
          url: ""
        },
        latest_invoice: null
      } as any; // Using any as a last resort due to complexity of Stripe types
      
      console.log("Testing subscription change with mock subscription:", mockSubscription);
      
      // Call the handleSubscriptionChange method directly
      await PaymentService["handleSubscriptionChange"](mockSubscription);
      
      // Get the updated profile
      const { data: updatedProfile, error: updatedProfileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
        
      if (updatedProfileError) {
        return NextResponse.json(
          { error: `Error fetching updated profile: ${updatedProfileError.message}` },
          { status: 500 }
        );
      }
      
      // Get credit history - using any type due to schema not being fully defined in the Database type
      let creditHistory = [];
      try {
        const { data: creditHistoryData } = await (supabase as any)
          .from("credit_history")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5);
          
        creditHistory = creditHistoryData || [];
      } catch (err) {
        console.error("Error fetching credit history:", err);
      }
        
      // Return the results
      return NextResponse.json({
        status: "success",
        message: `Tested subscription change to ${tier}`,
        before: profileData,
        after: updatedProfile,
        creditHistory: creditHistory
      });
    }
    
    // Invalid action
    return NextResponse.json(
      { 
        error: `Invalid action: ${action}${!userId ? '. Note: userId is missing' : ''}` 
      },
      { status: 400 }
    );
    
  } catch (error) {
    console.error("Error in test-webhook:", error);
    return NextResponse.json(
      { error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 