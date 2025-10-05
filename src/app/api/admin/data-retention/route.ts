import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dataRetentionManager } from '@/lib/data-retention'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const runRetentionSchema = z.object({
  dryRun: z.boolean().default(false),
  policies: z.array(z.string()).optional() // Specific table names to run
})

// GET - Get retention status and report
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has admin or owner role
    const supabase = await createClient()
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('email', session.user.email)
      .single()

    if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const report = await dataRetentionManager.getRetentionReport()

    return NextResponse.json({
      success: true,
      report
    })

  } catch (error) {
    console.error('Failed to get retention report:', error)
    return NextResponse.json(
      { error: 'Failed to generate retention report' },
      { status: 500 }
    )
  }
}

// POST - Execute retention policies
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has admin or owner role
    const supabase = await createClient()
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('email', session.user.email)
      .single()

    if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { dryRun, policies } = runRetentionSchema.parse(body)

    if (dryRun) {
      // For dry run, just return what would be affected
      const report = await dataRetentionManager.getRetentionReport()
      
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: 'Dry run completed - no data was actually deleted',
        report: report.dataCategories.filter(category => 
          !policies || policies.includes(category.table)
        )
      })
    }

    // Execute actual retention policies
    const results = await dataRetentionManager.enforceRetentionPolicies()

    // Filter results if specific policies were requested
    const filteredResults = policies 
      ? results.filter(result => policies.includes(result.table))
      : results

    const totalRecordsAffected = filteredResults.reduce(
      (sum, result) => sum + (result.recordsAffected || 0), 
      0
    )

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `Data retention policies executed successfully`,
      results: filteredResults,
      summary: {
        policiesExecuted: filteredResults.length,
        successfulPolicies: filteredResults.filter(r => r.success).length,
        totalRecordsAffected
      }
    })

  } catch (error) {
    console.error('Failed to execute retention policies:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to execute retention policies' },
      { status: 500 }
    )
  }
}

// DELETE - Process scheduled account deletions
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has admin or owner role
    const supabase = await createClient()
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('email', session.user.email)
      .single()

    if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get accounts scheduled for deletion before processing
    const { data: accountsToDelete } = await supabase
      .from('users')
      .select('email, deletion_scheduled_at')
      .not('deletion_scheduled_at', 'is', null)
      .lt('deletion_scheduled_at', new Date().toISOString())
      .eq('account_status', 'deletion_pending')

    if (!accountsToDelete || accountsToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No accounts scheduled for deletion',
        accountsProcessed: 0
      })
    }

    // Process scheduled deletions
    await dataRetentionManager.processScheduledDeletions()

    return NextResponse.json({
      success: true,
      message: `Processed ${accountsToDelete.length} scheduled account deletions`,
      accountsProcessed: accountsToDelete.length,
      deletedAccounts: accountsToDelete.map(account => ({
        email: account.email,
        scheduledFor: account.deletion_scheduled_at
      }))
    })

  } catch (error) {
    console.error('Failed to process scheduled deletions:', error)
    return NextResponse.json(
      { error: 'Failed to process scheduled deletions' },
      { status: 500 }
    )
  }
}