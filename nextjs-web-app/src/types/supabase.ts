import { SupabaseClient } from '@supabase/supabase-js';

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
          id: string;
          credits: number;
          max_monthly_credits: number;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_period_start: string | null;
          subscription_period_end: string | null;
          last_credited_at: string | null;
          subscription_tier: string;
          subscription_status: string | null;
          updated_at: string;
          first_name: string | null;
        };
        Insert: {
          id: string;
          credits?: number;
          max_monthly_credits?: number;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_period_start?: string | null;
          subscription_period_end?: string | null;
          last_credited_at?: string | null;
          subscription_tier?: string;
          subscription_status?: string | null;
          updated_at?: string;
          first_name?: string | null;
        };
        Update: {
          id?: string;
          credits?: number;
          max_monthly_credits?: number;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_period_start?: string | null;
          subscription_period_end?: string | null;
          last_credited_at?: string | null;
          subscription_tier?: string;
          subscription_status?: string | null;
          updated_at?: string;
          first_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      };
      generation_requests: {
        Row: {
          id: string;
          user_id: string;
          prompt: string;
          config: {
            numGenerations: number;
            styles: string[];
            modelTypes: string[];
          };
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          prompt: string;
          config: {
            numGenerations: number;
            styles: string[];
            modelTypes: string[];
          };
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          prompt?: string;
          config?: {
            numGenerations?: number;
            styles?: string[];
            modelTypes?: string[];
          };
          created_at?: string;
          updated_at?: string;
        };
      };
      generations: {
        Row: {
          id: string;
          request_id: string;
          style: string;
          code: string;
          model_type: string;
          generation_time: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          style: string;
          code: string;
          model_type: string;
          generation_time?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string;
          style?: string;
          code?: string;
          model_type?: string;
          generation_time?: number | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never
    };
    Functions: {
      deduct_generation_credit: {
        Args: {
          user_id: string;
          request_id: string | null;
        };
        Returns: {
          new_credits: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never
    };
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Type for user metadata stored in Supabase Auth
export type UserMetadata = Record<string, unknown>

export type TypedSupabaseClient = SupabaseClient<Database>; 