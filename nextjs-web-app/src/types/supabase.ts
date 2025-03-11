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
          stripe_customer_id?: string | null
          subscription_tier?: string | null
          subscription_status?: string | null
          email?: string | null
        }
        Insert: {
          id: string
          first_name?: string | null
          created_at?: string
          updated_at?: string
          credits?: number
          stripe_customer_id?: string | null
          subscription_tier?: string | null
          subscription_status?: string | null
          email?: string | null
        }
        Update: {
          id?: string
          first_name?: string | null
          created_at?: string
          updated_at?: string
          credits?: number
          stripe_customer_id?: string | null
          subscription_tier?: string | null
          subscription_status?: string | null
          email?: string | null
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
export type UserMetadata = {
  first_name?: string
} 