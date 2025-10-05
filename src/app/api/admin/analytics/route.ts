import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// Helper to convert cents to dollars
function centsToDollars(cents: number): number {
  return cents / 100
}

// Helper to get client IP
function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] ||
         request.headers.get('x-real-ip') ||
         'unknown'
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is owner - SERVER-SIDE ONLY
    // Only owner can view business analytics (MRR, ARR, etc.)
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('email, plan')
      .eq('id', user.id)
      .single() as { data: { email: string; plan: string } | null; error: any }

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL
    const isOwner = userProfile.plan === 'founder' &&
                    FOUNDER_EMAIL &&
                    userProfile.email === FOUNDER_EMAIL

    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden - Owner access required' }, { status: 403 })
    }

    // Log analytics access
    await (supabase as any)
      .from('analytics_audit_log')
      .insert({
        user_id: user.id,
        user_email: user.email,
        action: 'api_access',
        resource: 'analytics_dashboard',
        ip_address: getClientIP(request),
        user_agent: request.headers.get('user-agent'),
        metadata: {
          endpoint: '/api/admin/analytics',
          timestamp: new Date().toISOString()
        }
      })

    // Get date range from query params
    const { searchParams } = new URL(request.url)
    const daysBack = parseInt(searchParams.get('days') || '30')

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    // Fetch daily facts for the period
    const { data: dailyFacts, error: factsError } = await (supabase as any)
      .from('facts_daily')
      .select('*')
      .gte('day', startDate.toISOString().split('T')[0])
      .lte('day', endDate.toISOString().split('T')[0])
      .order('day', { ascending: true })

    if (factsError) {
      console.error('Error fetching daily facts:', factsError)
      return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
    }

    // Get latest day for current metrics
    const latestDay = dailyFacts[dailyFacts.length - 1] || {
      mrr_cents_normalized: 0,
      arr_cents: 0,
      active_subscribers: 0,
      arpu_cents: 0,
      new_mrr_cents: 0,
      expansion_mrr_cents: 0,
      contraction_mrr_cents: 0,
      churned_mrr_cents: 0,
      reactivation_mrr_cents: 0,
      new_customers: 0,
      churned_customers: 0,
      trial_starts: 0,
      trial_conversions: 0,
      trial_active: 0,
      past_due_subscribers: 0,
      failed_payments: 0,
      recovered_payments: 0,
      mrr_plan_pro_cents: 0,
      subs_plan_pro: 0,
      arpu_plan_pro_cents: 0,
      mrr_plan_free_cents: 0,
      subs_plan_free: 0,
      mrr_plan_founder_cents: 0,
      subs_plan_founder: 0
    }

    // Get previous period for comparison
    const previousPeriodEnd = new Date(startDate)
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1)
    const previousPeriodStart = new Date(previousPeriodEnd)
    previousPeriodStart.setDate(previousPeriodStart.getDate() - daysBack)

    const { data: previousFacts } = await (supabase as any)
      .from('facts_daily')
      .select('*')
      .gte('day', previousPeriodStart.toISOString().split('T')[0])
      .lte('day', previousPeriodEnd.toISOString().split('T')[0])
      .order('day', { ascending: false })
      .limit(1)
      .single()

    const previousMRR = previousFacts?.mrr_cents_normalized || 0

    // Calculate MRR growth rate
    const mrrGrowthRate = previousMRR > 0
      ? (((latestDay.mrr_cents_normalized - previousMRR) / previousMRR) * 100).toFixed(2)
      : '0.00'

    // Calculate net new MRR
    const netNewMRR = (latestDay.new_mrr_cents + latestDay.expansion_mrr_cents) -
                      (latestDay.churned_mrr_cents + latestDay.contraction_mrr_cents)

    // Calculate churn rates
    const totalChurned = dailyFacts.reduce((sum: number, day: any) => sum + day.churned_customers, 0)
    const totalActive = latestDay.active_subscribers
    const logoChurnRate = (totalActive + totalChurned) > 0
      ? ((totalChurned / (totalActive + totalChurned)) * 100).toFixed(2)
      : '0.00'

    const totalRevenueChurned = dailyFacts.reduce((sum: number, day: any) => sum + day.churned_mrr_cents, 0)
    const grossChurnRate = previousMRR > 0
      ? ((totalRevenueChurned / previousMRR) * 100).toFixed(2)
      : '0.00'

    // Calculate NRR (Net Revenue Retention)
    const totalExpansion = dailyFacts.reduce((sum: number, day: any) => sum + day.expansion_mrr_cents, 0)
    const totalContraction = dailyFacts.reduce((sum: number, day: any) => sum + day.contraction_mrr_cents, 0)
    const netRevenueRetention = previousMRR > 0
      ? (((previousMRR - totalRevenueChurned - totalContraction + totalExpansion) / previousMRR) * 100).toFixed(2)
      : '100.00'

    // Trial conversion rate
    const totalTrialStarts = dailyFacts.reduce((sum: number, day: any) => sum + day.trial_starts, 0)
    const totalTrialConversions = dailyFacts.reduce((sum: number, day: any) => sum + day.trial_conversions, 0)
    const trialConversionRate = totalTrialStarts > 0
      ? ((totalTrialConversions / totalTrialStarts) * 100).toFixed(2)
      : '0.00'

    // Fetch user counts
    const { data: users } = await (supabase as any)
      .from('users')
      .select('id, plan, created_at')

    const totalUsers = users?.length || 0
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const newUsersLast30Days = users?.filter((u: any) =>
      new Date(u.created_at) > thirtyDaysAgo
    ).length || 0

    const planCounts = {
      free: users?.filter((u: any) => u.plan === 'free').length || 0,
      pro: users?.filter((u: any) => u.plan === 'pro').length || 0,
      founder: users?.filter((u: any) => u.plan === 'founder').length || 0
    }

    // Fetch site statistics
    const { data: sites } = await (supabase as any)
      .from('sites')
      .select('id, status')

    const totalSites = sites?.length || 0
    const activeSites = sites?.filter((s: any) => s.status === 'up').length || 0

    // Fetch monitoring stats
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const { data: uptimeLogs } = await (supabase as any)
      .from('uptime_logs')
      .select('id')
      .gte('checked_at', yesterday.toISOString())

    const checksLast24h = uptimeLogs?.length || 0

    // Build monthly charts
    const monthlySignups = []
    const arpuTrend = []
    const mrrTrend = []

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date()
      monthStart.setMonth(monthStart.getMonth() - i)
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)

      const monthName = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

      // Signups
      const signups = users?.filter((u: any) => {
        const createdAt = new Date(u.created_at)
        return createdAt >= monthStart && createdAt < monthEnd
      }).length || 0

      monthlySignups.push({ month: monthName, signups })

      // ARPU & MRR from facts
      const monthFacts = dailyFacts.filter((f: any) => {
        const factDate = new Date(f.day)
        return factDate >= monthStart && factDate < monthEnd
      })

      if (monthFacts.length > 0) {
        const avgARPU = monthFacts.reduce((sum: number, f: any) => sum + f.arpu_cents, 0) / monthFacts.length
        const avgMRR = monthFacts.reduce((sum: number, f: any) => sum + f.mrr_cents_normalized, 0) / monthFacts.length

        arpuTrend.push({ month: monthName, arpu: parseFloat(centsToDollars(avgARPU).toFixed(2)) })
        mrrTrend.push({ month: monthName, mrr: parseFloat(centsToDollars(avgMRR).toFixed(2)) })
      } else {
        arpuTrend.push({ month: monthName, arpu: 0 })
        mrrTrend.push({ month: monthName, mrr: 0 })
      }
    }

    // Calculate LTV (simplified: ARPU × 12 months avg lifespan)
    const avgCustomerLifespan = 12
    const currentARPU = centsToDollars(latestDay.arpu_cents)
    const ltv = currentARPU * avgCustomerLifespan

    // Fetch annotations
    const { data: annotations } = await (supabase as any)
      .from('chart_annotations')
      .select('*')
      .gte('annotation_date', startDate.toISOString().split('T')[0])
      .order('annotation_date', { ascending: true })

    return NextResponse.json({
      revenue: {
        mrr: centsToDollars(latestDay.mrr_cents_normalized),
        previousMRR: centsToDollars(previousMRR),
        mrrGrowthRate: mrrGrowthRate,
        arr: centsToDollars(latestDay.arr_cents),
        netNewMRR: centsToDollars(netNewMRR),
        newMRR: centsToDollars(latestDay.new_mrr_cents),
        expansionMRR: centsToDollars(latestDay.expansion_mrr_cents),
        churnedMRR: centsToDollars(latestDay.churned_mrr_cents),
        contractionMRR: centsToDollars(latestDay.contraction_mrr_cents),
        reactivationMRR: centsToDollars(latestDay.reactivation_mrr_cents),
        ltv: ltv.toFixed(2),
        cac: 0, // Placeholder
        arpu: currentARPU.toFixed(2)
      },
      subscribers: {
        active: latestDay.active_subscribers,
        trial: latestDay.trial_active,
        canceled: totalChurned,
        churnRate: logoChurnRate,
        grossChurnRate: grossChurnRate,
        netRevenueRetention: netRevenueRetention,
        trialConversionRate: trialConversionRate,
        pastDue: latestDay.past_due_subscribers
      },
      users: {
        total: totalUsers,
        newLast30Days: newUsersLast30Days,
        byPlan: planCounts
      },
      sites: {
        total: totalSites,
        active: activeSites
      },
      monitoring: {
        checksLast24h: checksLast24h,
        alertsSent: 0, // Can add from alerts table if needed
        failedPayments: latestDay.failed_payments,
        recoveredPayments: latestDay.recovered_payments
      },
      planMetrics: {
        revenue: {
          free: centsToDollars(latestDay.mrr_plan_free_cents),
          pro: centsToDollars(latestDay.mrr_plan_pro_cents),
          founder: centsToDollars(latestDay.mrr_plan_founder_cents)
        },
        arpu: {
          free: centsToDollars(latestDay.arpu_plan_pro_cents || 0),
          pro: centsToDollars(latestDay.arpu_plan_pro_cents),
          founder: 0
        },
        counts: {
          free: latestDay.subs_plan_free,
          pro: latestDay.subs_plan_pro,
          founder: planCounts.founder
        }
      },
      charts: {
        monthlySignups,
        arpuTrend,
        mrrTrend,
        annotations: annotations || []
      },
      dataQuality: {
        latestBackfill: latestDay.last_computed_at,
        checksPass: latestDay.data_quality_check_passed
      },
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
