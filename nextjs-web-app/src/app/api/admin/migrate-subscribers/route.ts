import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'
import { captureError, ErrorCategory } from '@/lib/sentry'

// This endpoint should be protected and only accessible by admins
// In production, add proper authentication and authorization
export async function POST(request: NextRequest) {
  try {
    // Basic security check - in production, implement proper admin authentication
    const authHeader = request.headers.get('authorization')
    const adminKey = process.env.ADMIN_MIGRATION_KEY
    
    if (!adminKey || authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient()
    
    // Get migration status before running
    const { data: beforeStatus, error: beforeError } = await supabase
      .from('migration_status')
      .select('*')
    
    if (beforeError) {
      throw new Error(`Failed to get migration status: ${beforeError.message}`)
    }

    const pendingMigrations = beforeStatus?.filter(user => user.migration_status === 'pending_migration') || []
    
    if (pendingMigrations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users require migration',
        migratedUsers: [],
        totalMigrated: 0
      })
    }

    // Run the migration function
    const { error: migrationError } = await supabase.rpc('migrate_existing_subscribers')
    
    if (migrationError) {
      throw new Error(`Migration failed: ${migrationError.message}`)
    }

    // Get migration status after running
    const { data: afterStatus, error: afterError } = await supabase
      .from('migration_status')
      .select('*')
    
    if (afterError) {
      throw new Error(`Failed to get post-migration status: ${afterError.message}`)
    }

    const migratedUsers = afterStatus?.filter(user => user.migration_status === 'migrated') || []
    
    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${migratedUsers.length} users to token system`,
      migratedUsers: migratedUsers.map(user => ({
        id: user.id,
        email: user.email,
        tokenBalance: user.token_balance,
        previousPlan: 'pro'
      })),
      totalMigrated: migratedUsers.length
    })

  } catch (error) {
    console.error('Migration error:', error)
    captureError(
      error instanceof Error ? error : new Error('Migration failed'),
      ErrorCategory.API,
      { action: 'migrate_subscribers' }
    )
    
    return NextResponse.json(
      { 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Get migration status
export async function GET(request: NextRequest) {
  try {
    // Basic security check
    const authHeader = request.headers.get('authorization')
    const adminKey = process.env.ADMIN_MIGRATION_KEY
    
    if (!adminKey || authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient()
    
    const { data: migrationStatus, error } = await supabase
      .from('migration_status')
      .select('*')
      .order('email')
    
    if (error) {
      throw new Error(`Failed to get migration status: ${error.message}`)
    }

    const statusSummary = {
      pending_migration: migrationStatus?.filter(u => u.migration_status === 'pending_migration').length || 0,
      migrated: migrationStatus?.filter(u => u.migration_status === 'migrated').length || 0,
      free_user: migrationStatus?.filter(u => u.migration_status === 'free_user').length || 0,
      unknown: migrationStatus?.filter(u => u.migration_status === 'unknown').length || 0,
    }

    return NextResponse.json({
      success: true,
      summary: statusSummary,
      users: migrationStatus || []
    })

  } catch (error) {
    console.error('Error getting migration status:', error)
    captureError(
      error instanceof Error ? error : new Error('Failed to get migration status'),
      ErrorCategory.API,
      { action: 'get_migration_status' }
    )
    
    return NextResponse.json(
      { 
        error: 'Failed to get migration status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
