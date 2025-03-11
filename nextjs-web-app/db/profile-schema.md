| column_name               | data_type                | is_nullable | column_default |
| ------------------------- | ------------------------ | ----------- | -------------- |
| id                        | uuid                     | NO          | null           |
| credits                   | integer                  | NO          | 30             |
| max_daily_credits         | integer                  | NO          | 30             |
| stripe_customer_id        | text                     | YES         | null           |
| stripe_subscription_id    | text                     | YES         | null           |
| last_credit_refresh       | timestamp with time zone | YES         | now()          |
| max_monthly_credits       | integer                  | NO          | 30             |
| subscription_period_start | timestamp with time zone | YES         | null           |
| subscription_period_end   | timestamp with time zone | YES         | null           |
| last_credited_at          | timestamp with time zone | YES         | now()          |
| subscription_tier         | text                     | NO          | 'free'::text   |
| subscription_status       | text                     | YES         | null           |
| updated_at                | timestamp with time zone | NO          | now()          |