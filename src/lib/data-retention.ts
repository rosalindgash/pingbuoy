import { createClient } from './supabase-server'
import { sendEmail } from './email'

interface RetentionPolicy {
  table: string
  dateColumn: string
  retentionPeriod: number // days
  softDelete?: boolean
  archiveTable?: string
  conditions?: Record<string, any>
  cascade?: string[]
}

const RETENTION_POLICIES: RetentionPolicy[] = [
  // User Analytics - 90 days
  {
    table: 'user_analytics',
    dateColumn: 'created_at',
    retentionPeriod: 90,
    softDelete: false
  },
  
  // Alert History - 2 years (24 months)
  {
    table: 'alerts',
    dateColumn: 'created_at',
    retentionPeriod: 730,
    softDelete: false,
    conditions: { status: 'resolved' }
  },
  
  // Email Notifications - 1 year
  {
    table: 'notifications',
    dateColumn: 'sent_at',
    retentionPeriod: 365,
    softDelete: false
  },
  
  // Security Logs - 1 year
  {
    table: 'security_logs',
    dateColumn: 'created_at',
    retentionPeriod: 365,
    softDelete: false
  },
  
  // Privacy Requests - Archive after 1 year
  {
    table: 'privacy_requests',
    dateColumn: 'created_at',
    retentionPeriod: 365,
    softDelete: false,
    archiveTable: 'privacy_requests_archive',
    conditions: { status: ['completed', 'cancelled'] }
  },
  
  // Failed Login Attempts - 30 days
  {
    table: 'failed_logins',
    dateColumn: 'attempted_at',
    retentionPeriod: 30,
    softDelete: false
  },
  
  // Unverified Email Subscriptions - 30 days
  {
    table: 'status_subscribers',
    dateColumn: 'created_at',
    retentionPeriod: 30,
    softDelete: false,
    conditions: { is_verified: false }
  },
  
  // Expired Password Reset Tokens - 7 days
  {
    table: 'password_resets',
    dateColumn: 'expires_at',
    retentionPeriod: 7,
    softDelete: false,
    conditions: { used: false }
  },
  
  // Dead Link Scan Results - 6 months (keep for trend analysis)
  {
    table: 'dead_link_scans',
    dateColumn: 'scanned_at',
    retentionPeriod: 180,
    softDelete: false
  },
  
  // Monitor Check Results - 3 months (keep recent for analytics)
  {
    table: 'monitor_checks',
    dateColumn: 'checked_at',
    retentionPeriod: 90,
    softDelete: false
  },
  
  // Rate Limit Records - 24 hours
  {
    table: 'rate_limits',
    dateColumn: 'created_at',
    retentionPeriod: 1,
    softDelete: false
  }
]

export class DataRetentionManager {
  private getSupabase() {
    return createClient()
  }

  async enforceRetentionPolicies(): Promise<void> {
    const results = []
    
    for (const policy of RETENTION_POLICIES) {
      try {
        const result = await this.enforcePolicy(policy)
        results.push(result)
      } catch (error) {
        console.error(`Failed to enforce retention policy for ${policy.table}:`, error)
        results.push({
          table: policy.table,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Log results
    await this.logRetentionResults(results)
    
    return results
  }

  private async enforcePolicy(policy: RetentionPolicy) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriod)
    
    const supabase = await this.getSupabase()
    let query = supabase
      .from(policy.table)
      .select('count', { count: 'exact', head: true })
      .lt(policy.dateColumn, cutoffDate.toISOString())

    // Apply conditions if specified
    if (policy.conditions) {
      for (const [key, value] of Object.entries(policy.conditions)) {
        if (Array.isArray(value)) {
          query = query.in(key, value)
        } else {
          query = query.eq(key, value)
        }
      }
    }

    // Get count of records to be affected
    const { count: recordCount } = await query

    if (!recordCount || recordCount === 0) {
      return {
        table: policy.table,
        success: true,
        recordsAffected: 0,
        action: 'none'
      }
    }

    // Archive or delete records
    if (policy.archiveTable) {
      return await this.archiveRecords(policy, cutoffDate)
    } else {
      return await this.deleteRecords(policy, cutoffDate)
    }
  }

  private async archiveRecords(policy: RetentionPolicy, cutoffDate: Date) {
    // First, copy records to archive table
    const supabase = await this.getSupabase()
    const { data: recordsToArchive, error: selectError } = await supabase
      .from(policy.table)
      .select('*')
      .lt(policy.dateColumn, cutoffDate.toISOString())
      .apply(query => {
        if (policy.conditions) {
          for (const [key, value] of Object.entries(policy.conditions)) {
            if (Array.isArray(value)) {
              query = query.in(key, value)
            } else {
              query = query.eq(key, value)
            }
          }
        }
        return query
      })

    if (selectError) throw selectError
    if (!recordsToArchive || recordsToArchive.length === 0) {
      return {
        table: policy.table,
        success: true,
        recordsAffected: 0,
        action: 'archive'
      }
    }

    // Add archive metadata
    const archiveRecords = recordsToArchive.map(record => ({
      ...record,
      archived_at: new Date().toISOString(),
      original_table: policy.table
    }))

    // Insert into archive table
    const { error: archiveError } = await supabase
      .from(policy.archiveTable!)
      .insert(archiveRecords)

    if (archiveError) throw archiveError

    // Delete from original table
    let deleteQuery = supabase
      .from(policy.table)
      .delete()
      .lt(policy.dateColumn, cutoffDate.toISOString())

    if (policy.conditions) {
      for (const [key, value] of Object.entries(policy.conditions)) {
        if (Array.isArray(value)) {
          deleteQuery = deleteQuery.in(key, value)
        } else {
          deleteQuery = deleteQuery.eq(key, value)
        }
      }
    }

    const { error: deleteError } = await deleteQuery

    if (deleteError) throw deleteError

    return {
      table: policy.table,
      success: true,
      recordsAffected: recordsToArchive.length,
      action: 'archive',
      archivedTo: policy.archiveTable
    }
  }

  private async deleteRecords(policy: RetentionPolicy, cutoffDate: Date) {
    const supabase = await this.getSupabase()
    let deleteQuery = supabase
      .from(policy.table)
      .delete()
      .lt(policy.dateColumn, cutoffDate.toISOString())

    // Apply conditions if specified
    if (policy.conditions) {
      for (const [key, value] of Object.entries(policy.conditions)) {
        if (Array.isArray(value)) {
          deleteQuery = deleteQuery.in(key, value)
        } else {
          deleteQuery = deleteQuery.eq(key, value)
        }
      }
    }

    const { data, error } = await deleteQuery.select('count', { count: 'exact' })

    if (error) throw error

    return {
      table: policy.table,
      success: true,
      recordsAffected: data?.length || 0,
      action: 'delete'
    }
  }

  private async logRetentionResults(results: any[]) {
    const logEntry = {
      job_type: 'data_retention',
      executed_at: new Date().toISOString(),
      results: results,
      total_policies: RETENTION_POLICIES.length,
      successful_policies: results.filter(r => r.success).length,
      total_records_affected: results.reduce((sum, r) => sum + (r.recordsAffected || 0), 0)
    }

    try {
      const supabase = await this.getSupabase()
      await supabase
        .from('job_logs')
        .insert(logEntry)
    } catch (error) {
      console.error('Failed to log retention results:', error)
    }

    // If significant data was purged, send notification to admins
    if (logEntry.total_records_affected > 1000) {
      try {
        await this.notifyAdminsOfRetention(logEntry)
      } catch (error) {
        console.error('Failed to send admin notification:', error)
      }
    }
  }

  private async notifyAdminsOfRetention(logEntry: any) {
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
    
    if (adminEmails.length === 0) return

    const emailPromises = adminEmails.map(email =>
      sendEmail({
        to: email.trim(),
        subject: '📊 Data Retention Policy Executed - PingBuoy',
        template: 'admin-data-retention-report',
        data: {
          executedAt: logEntry.executed_at,
          totalPolicies: logEntry.total_policies,
          successfulPolicies: logEntry.successful_policies,
          totalRecordsAffected: logEntry.total_records_affected,
          results: logEntry.results,
          dashboardUrl: `${process.env.NEXTAUTH_URL}/admin/data-retention`
        }
      })
    )

    await Promise.allSettled(emailPromises)
  }

  async processScheduledDeletions(): Promise<void> {
    // Find accounts scheduled for deletion where grace period has expired
    const supabase = await this.getSupabase()
    const { data: accountsToDelete, error } = await supabase
      .from('users')
      .select('*')
      .not('deletion_scheduled_at', 'is', null)
      .lt('deletion_scheduled_at', new Date().toISOString())
      .eq('account_status', 'deletion_pending')

    if (error) {
      console.error('Failed to fetch accounts for deletion:', error)
      return
    }

    if (!accountsToDelete || accountsToDelete.length === 0) {
      return
    }

    console.log(`Processing ${accountsToDelete.length} scheduled account deletions`)

    for (const user of accountsToDelete) {
      try {
        await this.deleteUserAccount(user)
      } catch (error) {
        console.error(`Failed to delete account for ${user.email}:`, error)
        
        // Mark deletion as failed
        const supabaseForError = await this.getSupabase()
        await supabaseForError
          .from('privacy_requests')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('user_email', user.email)
          .eq('request_type', 'deletion')
          .eq('status', 'confirmed')
      }
    }
  }

  private async deleteUserAccount(user: any): Promise<void> {
    const userEmail = user.email
    const supabase = await this.getSupabase()

    // Delete user data from all tables
    const tablesToCleanup = [
      'website_monitors',
      'alerts',
      'integrations',
      'notifications',
      'user_analytics',
      'dead_link_scans',
      'monitor_checks',
      'subscriptions',
      'api_keys'
    ]

    for (const table of tablesToCleanup) {
      try {
        await supabase
          .from(table)
          .delete()
          .eq('user_email', userEmail)
      } catch (error) {
        console.error(`Failed to delete ${table} for ${userEmail}:`, error)
        // Continue with other tables
      }
    }

    // Delete user record
    await supabase
      .from('users')
      .delete()
      .eq('email', userEmail)

    // Mark privacy request as completed
    await supabase
      .from('privacy_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('user_email', userEmail)
      .eq('request_type', 'deletion')
      .eq('status', 'confirmed')

    console.log(`Successfully deleted account for ${userEmail}`)
  }

  async getRetentionReport(): Promise<any> {
    const report = {
      policies: RETENTION_POLICIES.length,
      lastRun: null as string | null,
      upcomingDeletions: {
        accounts: 0,
        gracePeriodExpiring: 0
      },
      dataCategories: [] as any[]
    }

    try {
      const supabase = await this.getSupabase()
      // Get last retention run
      const { data: lastRun } = await supabase
        .from('job_logs')
        .select('executed_at, results')
        .eq('job_type', 'data_retention')
        .order('executed_at', { ascending: false })
        .limit(1)
        .single()

      if (lastRun) {
        report.lastRun = lastRun.executed_at
      }

      // Get upcoming account deletions
      const { data: scheduledDeletions } = await supabase
        .from('users')
        .select('deletion_scheduled_at')
        .not('deletion_scheduled_at', 'is', null)
        .eq('account_status', 'deletion_pending')

      if (scheduledDeletions) {
        const now = new Date()
        const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000))

        report.upcomingDeletions.accounts = scheduledDeletions.length
        report.upcomingDeletions.gracePeriodExpiring = scheduledDeletions.filter(
          account => new Date(account.deletion_scheduled_at) <= threeDaysFromNow
        ).length
      }

      // Get data category statistics
      for (const policy of RETENTION_POLICIES) {
        try {
          const cutoffDate = new Date()
          cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriod)

          let query = supabase
            .from(policy.table)
            .select('count', { count: 'exact', head: true })
            .lt(policy.dateColumn, cutoffDate.toISOString())

          if (policy.conditions) {
            for (const [key, value] of Object.entries(policy.conditions)) {
              if (Array.isArray(value)) {
                query = query.in(key, value)
              } else {
                query = query.eq(key, value)
              }
            }
          }

          const { count } = await query

          report.dataCategories.push({
            table: policy.table,
            retentionPeriod: policy.retentionPeriod,
            recordsEligibleForDeletion: count || 0,
            action: policy.archiveTable ? 'archive' : 'delete',
            archiveTable: policy.archiveTable
          })
        } catch (error) {
          console.error(`Failed to get stats for ${policy.table}:`, error)
        }
      }

    } catch (error) {
      console.error('Failed to generate retention report:', error)
    }

    return report
  }
}

// Export singleton instance
export const dataRetentionManager = new DataRetentionManager()