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
          created_at: string
          updated_at: string
          credits: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier?: 'free' | 'pro' | 'ultra' | null
          subscription_status?: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'unpaid' | null
          subscription_period_start?: string | null
          subscription_period_end?: string | null
          last_credit_refresh?: string | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          credits?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier?: 'free' | 'pro' | 'ultra' | null
          subscription_status?: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'unpaid' | null
          subscription_period_start?: string | null
          subscription_period_end?: string | null
          last_credit_refresh?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          credits?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier?: 'free' | 'pro' | 'ultra' | null
          subscription_status?: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'unpaid' | null
          subscription_period_start?: string | null
          subscription_period_end?: string | null
          last_credit_refresh?: string | null
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
export type UserMetadata = Record<string, unknown> 