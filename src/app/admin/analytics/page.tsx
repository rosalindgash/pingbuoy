'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Globe,
  BarChart3,
  Download,
  Calendar,
  ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart
} from 'recharts'
import { supabase } from '@/lib/supabase'

interface AnalyticsData {
  revenue: {
    mrr: number
    previousMRR: number
    mrrGrowthRate: string
    arr: number
    netNewMRR: number
    newMRR: number
    expansionMRR: number
    churnedMRR: number
    contractionMRR: number
    ltv: string
    cac: number
    arpu: string
  }
  subscribers: {
    active: number
    trial: number
    canceled: number
    churnRate: string
    grossChurnRate: string
    netRevenueRetention: string
    trialConversionRate: string
  }
  users: {
    total: number
    newLast30Days: number
    byPlan: {
      free: number
      pro: number
      founder: number
    }
  }
  sites: {
    total: number
    active: number
  }
  monitoring: {
    checksLast24h: number
    alertsSent: number
  }
  planMetrics: {
    revenue: { free: number; pro: number; founder: number }
    arpu: { free: number; pro: number; founder: number }
    counts: { free: number; pro: number; founder: number }
  }
  charts: {
    monthlySignups: Array<{ month: string; signups: number }>
    arpuTrend: Array<{ month: string; arpu: number }>
  }
  lastUpdated: string
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('30') // days
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    checkAccess()
  }, [])

  useEffect(() => {
    if (autoRefresh && isAdmin) {
      const interval = setInterval(() => {
        fetchAnalytics()
      }, 60000) // Refresh every minute
      return () => clearInterval(interval)
    }
  }, [autoRefresh, dateRange, isAdmin])

  const checkAccess = async () => {
    try {
      // Check admin status via secure server-side API
      const response = await fetch('/api/user/is-admin', {
        credentials: 'include'
      })

      if (!response.ok) {
        router.push('/dashboard')
        return
      }

      const { isAdmin: adminStatus } = await response.json()

      if (!adminStatus) {
        router.push('/dashboard')
        return
      }

      setIsAdmin(true)
      fetchAnalytics()
    } catch (err) {
      console.error('Access check failed:', err)
      router.push('/dashboard')
    }
  }

  const fetchAnalytics = async () => {
    try {
      setError(null)
      const response = await fetch(`/api/admin/analytics?days=${dateRange}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const analyticsData = await response.json()
      setData(analyticsData)
    } catch (err) {
      console.error('Analytics fetch error:', err)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchAnalytics()
  }

  const handleDateRangeChange = (days: string) => {
    setDateRange(days)
    setLoading(true)
    setTimeout(() => fetchAnalytics(), 100)
  }

  const exportToCSV = () => {
    if (!data) return

    const csvData = [
      ['Metric', 'Value'],
      ['MRR', `$${data.revenue.mrr.toFixed(2)}`],
      ['MRR Growth Rate', `${data.revenue.mrrGrowthRate}%`],
      ['ARR', `$${data.revenue.arr.toFixed(2)}`],
      ['Net New MRR', `$${data.revenue.netNewMRR.toFixed(2)}`],
      ['ARPU', `$${data.revenue.arpu}`],
      ['LTV', `$${data.revenue.ltv}`],
      ['Active Subscribers', data.subscribers.active],
      ['Churn Rate (Logo)', `${data.subscribers.churnRate}%`],
      ['Gross Churn Rate', `${data.subscribers.grossChurnRate}%`],
      ['Net Revenue Retention', `${data.subscribers.netRevenueRetention}%`],
      ['Trial Conversion Rate', `${data.subscribers.trialConversionRate}%`],
      ['Total Users', data.users.total],
      ['New Users (30d)', data.users.newLast30Days],
      ['Total Sites', data.sites.total],
      ['Active Sites', data.sites.active]
    ]

    const csv = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pingbuoy-analytics-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Failed to load analytics'}</p>
          <Button onClick={handleRefresh}>Retry</Button>
        </div>
      </div>
    )
  }

  const planDistribution = [
    { name: 'Free', value: data.users.byPlan.free, color: '#94A3B8' },
    { name: 'Pro', value: data.users.byPlan.pro, color: '#3B82F6' },
    { name: 'Founder', value: data.users.byPlan.founder, color: '#8B5CF6' }
  ]

  const planRevenueData = [
    { name: 'Pro', revenue: data.planMetrics.revenue.pro, arpu: data.planMetrics.arpu.pro }
  ]

  const mrrGrowthPositive = parseFloat(data.revenue.mrrGrowthRate) >= 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Business Analytics</h1>
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {new Date(data.lastUpdated).toLocaleString()} (CST)
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button variant="outline" className="flex items-center justify-center space-x-2 w-full sm:w-auto">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Dashboard</span>
                </Button>
              </Link>
              {/* Date Range Selector */}
              <select
                value={dateRange}
                onChange={(e) => handleDateRangeChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full sm:w-auto"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="60">Last 60 days</option>
                <option value="90">Last 90 days</option>
              </select>

              {/* Auto-refresh Toggle */}
              <Button
                onClick={() => setAutoRefresh(!autoRefresh)}
                variant={autoRefresh ? "default" : "outline"}
                className="flex items-center"
              >
                <Activity className="w-4 h-4 mr-2" />
                {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
              </Button>

              {/* Export Button */}
              <Button onClick={exportToCSV} variant="outline" className="flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>

              {/* Refresh Button */}
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                className="flex items-center"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Revenue Metrics */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* MRR with Growth */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">MRR</p>
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.revenue.mrr)}</p>
              <div className="flex items-center mt-2">
                {mrrGrowthPositive ? (
                  <ArrowUp className="w-4 h-4 text-green-600 mr-1" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-red-600 mr-1" />
                )}
                <p className={`text-sm ${mrrGrowthPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {data.revenue.mrrGrowthRate}% vs last period
                </p>
              </div>
            </div>

            {/* ARR */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">ARR</p>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.revenue.arr)}</p>
              <p className="text-xs text-gray-500 mt-2">Annual Recurring Revenue</p>
            </div>

            {/* Net New MRR */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Net New MRR</p>
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.revenue.netNewMRR)}</p>
              <p className="text-xs text-gray-500 mt-2">
                New: {formatCurrency(data.revenue.newMRR)} | Churned: {formatCurrency(data.revenue.churnedMRR)}
              </p>
            </div>

            {/* ARPU */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">ARPU</p>
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(parseFloat(data.revenue.arpu))}</p>
              <p className="text-xs text-gray-500 mt-2">Average Revenue Per User</p>
            </div>
          </div>
        </div>

        {/* Churn & Retention Metrics */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Churn & Retention</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Logo Churn */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Logo Churn</p>
                <Activity className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{data.subscribers.churnRate}%</p>
              <p className="text-xs text-gray-500 mt-2">Customer churn rate</p>
            </div>

            {/* Gross Churn */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Gross Churn</p>
                <TrendingDown className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{data.subscribers.grossChurnRate}%</p>
              <p className="text-xs text-gray-500 mt-2">Revenue churn rate</p>
            </div>

            {/* NRR */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">NRR</p>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{data.subscribers.netRevenueRetention}%</p>
              <p className="text-xs text-gray-500 mt-2">Net Revenue Retention</p>
            </div>

            {/* Trial Conversion */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Trial Conversion</p>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{data.subscribers.trialConversionRate}%</p>
              <p className="text-xs text-gray-500 mt-2">Free → Paid conversion</p>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* LTV */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">LTV</p>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(parseFloat(data.revenue.ltv))}</p>
            <p className="text-xs text-gray-500 mt-2">Lifetime Value</p>
          </div>

          {/* Total Users */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(data.users.total)}</p>
            <div className="flex items-center mt-2">
              <ArrowUp className="w-3 h-3 text-green-600 mr-1" />
              <p className="text-xs text-green-600">{data.users.newLast30Days} new (30d)</p>
            </div>
          </div>

          {/* Sites Monitored */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Sites Monitored</p>
              <Globe className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(data.sites.total)}</p>
            <p className="text-xs text-gray-500 mt-2">{data.sites.active} currently up</p>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Signups Chart */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Signups</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.charts.monthlySignups}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="signups" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ARPU Trend Chart */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">ARPU Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.charts.arpuTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Area type="monotone" dataKey="arpu" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Plan Distribution */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Users by Plan</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {planDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Plan Revenue Breakdown */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Revenue & ARPU</h3>
            <div className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pro Plan</p>
                  <p className="text-xs text-gray-500">{data.planMetrics.counts.pro} subscribers</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(data.planMetrics.revenue.pro)}</p>
                  <p className="text-xs text-gray-500">ARPU: {formatCurrency(data.planMetrics.arpu.pro)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Free Plan</p>
                  <p className="text-xs text-gray-500">{data.planMetrics.counts.free} users</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(data.planMetrics.revenue.free)}</p>
                  <p className="text-xs text-gray-500">ARPU: {formatCurrency(data.planMetrics.arpu.free)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health & Operations</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600">Uptime Checks (24h)</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(data.monitoring.checksLast24h)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Alerts Sent</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(data.monitoring.alertsSent)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Sites per User</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.users.total > 0 ? (data.sites.total / data.users.total).toFixed(1) : '0'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Site %</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.sites.total > 0 ? ((data.sites.active / data.sites.total) * 100).toFixed(1) : '0'}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
