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
        }
        Insert: {
          id: string
          first_name?: string | null
          created_at?: string
          updated_at?: string
          credits?: number
        }
        Update: {
          id?: string
          first_name?: string | null
          created_at?: string
          updated_at?: string
          credits?: number
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