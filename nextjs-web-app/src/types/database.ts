export interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  stripe_customer_id?: string
  subscription_status: 'free' | 'active' | 'canceled' | 'past_due' | 'unpaid'
  subscription_plan: 'free' | 'pro'
  daily_generations_used: number
  daily_generations_reset_date: string
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  stripe_subscription_id: string
  stripe_customer_id: string
  stripe_price_id: string
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid'
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  canceled_at?: string
  created_at: string
  updated_at: string
}

export interface UsageTracking {
  id: string
  user_id: string
  action_type: 'generation' | 'export' | 'deploy'
  metadata: Record<string, any>
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<UserProfile, 'id' | 'created_at'>> & {
          updated_at?: string
        }
      }
      subscriptions: {
        Row: Subscription
        Insert: Omit<Subscription, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Subscription, 'id' | 'created_at'>> & {
          updated_at?: string
        }
      }
      usage_tracking: {
        Row: UsageTracking
        Insert: Omit<UsageTracking, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<UsageTracking, 'id' | 'created_at'>>
      }
    }
  }
}
