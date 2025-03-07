export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          first_name: string | null
          created_at: string
          updated_at: string
          credits: number
          subscription_tier: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          id: string
          first_name?: string | null
          created_at?: string
          updated_at?: string
          credits?: number
          subscription_tier?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          id?: string
          first_name?: string | null
          created_at?: string
          updated_at?: string
          credits?: number
          subscription_tier?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      subscription_plans: {
        Row: {
          id: string
          name: string
          description: string
          price: number
          credits_per_month: number
          stripe_price_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          price: number
          credits_per_month: number
          stripe_price_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          price?: number
          credits_per_month?: number
          stripe_price_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          description: string
          created_at: string
          transaction_type: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          description: string
          created_at?: string
          transaction_type: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          description?: string
          created_at?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Type for user metadata stored in Supabase Auth
export type UserMetadata = {
  first_name?: string
} 

// Subscription tier types
export type SubscriptionTier = 'free' | 'pro' | 'ultra';

// Credit transaction types
export type TransactionType = 'purchase' | 'subscription' | 'usage' | 'refund'; 