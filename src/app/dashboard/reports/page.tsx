'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Download, FileText, Calendar, BarChart3, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getSiteUptimeStats } from '@/lib/uptime-client'

interface Site {
  id: string
  name: string
  url: string
  user_id: string
}

interface UserProfile {
  id: string
  plan: 'free' | 'pro' | 'founder'
}

interface Incident {
  id: string
  checked_at: string
  status: 'down'
  response_time: number | null
  status_code: number | null
  error_message: string | null
}

interface SiteReport {
  site: Site
  uptimePercent: number
  totalChecks: number
  upChecks: number
  downChecks: number
  avgResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  incidents: Incident[]
}

export default function ReportsPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<7 | 30 | 90>(7)
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [reportData, setReportData] = useState<SiteReport[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dateRangeDropdownOpen, setDateRangeDropdownOpen] = useState(false)
  const [viewModeDropdownOpen, setViewModeDropdownOpen] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const dateRangeRef = useRef<HTMLDivElement>(null)
  const viewModeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
      if (dateRangeRef.current && !dateRangeRef.current.contains(event.target as Node)) {
        setDateRangeDropdownOpen(false)
      }
      if (viewModeRef.current && !viewModeRef.current.contains(event.target as Node)) {
        setViewModeDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        window.location.href = '/login'
        return
      }
      setUser(user)
      await Promise.all([
        fetchProfile(user.id),
        fetchSites(user.id)
      ])
    } catch (err) {
      console.error('Error:', err)
      window.location.href = '/login'
    } finally {
      setLoading(false)
    }
  }

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('id, plan')
      .eq('id', userId)
      .single()
    setProfile(data)
  }

  const fetchSites = async (userId: string) => {
    const { data } = await supabase
      .from('sites')
      .select('id, name, url, user_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setSites(data || [])
  }

  // Validate UUID format
  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }

  const toggleSiteSelection = (siteId: string) => {
    setSelectedSiteIds(prev =>
      prev.includes(siteId)
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId]
    )
  }

  const selectAllSites = () => {
    setSelectedSiteIds(sites.map(s => s.id))
  }

  const deselectAllSites = () => {
    setSelectedSiteIds([])
  }

  const generateReport = async () => {
    if (selectedSiteIds.length === 0) return

    setGenerating(true)
    const reports: SiteReport[] = []

    for (const siteId of selectedSiteIds) {
      // Validate UUID format
      if (!isValidUUID(siteId)) {
        console.error('Invalid site ID format:', siteId)
        continue
      }

      const site = sites.find(s => s.id === siteId)
      if (!site) continue

      // Verify site belongs to current user (defense in depth)
      if (site.user_id !== user?.id) {
        console.error('Unauthorized site access attempt:', siteId)
        continue
      }

      // Fetch uptime logs for the selected date range
      const daysAgo = new Date()
      daysAgo.setDate(daysAgo.getDate() - dateRange)

      const { data: logs } = await supabase
        .from('uptime_logs')
        .select('*')
        .eq('site_id', siteId)
        .gte('checked_at', daysAgo.toISOString())
        .order('checked_at', { ascending: false })

      if (!logs || logs.length === 0) {
        reports.push({
          site,
          uptimePercent: 0,
          totalChecks: 0,
          upChecks: 0,
          downChecks: 0,
          avgResponseTime: 0,
          minResponseTime: 0,
          maxResponseTime: 0,
          incidents: []
        })
        continue
      }

      // Calculate stats
      const upChecks = logs.filter(l => l.status === 'up').length
      const downChecks = logs.filter(l => l.status === 'down').length
      const totalChecks = logs.length
      const uptimePercent = totalChecks > 0 ? (upChecks / totalChecks) * 100 : 0

      const responseTimes = logs
        .filter(l => l.response_time !== null && l.response_time > 0)
        .map(l => l.response_time)

      const avgResponseTime = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0

      const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0
      const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0

      // Get incidents (down status) - limit to first 25
      const incidents = logs
        .filter(l => l.status === 'down')
        .slice(0, 25)
        .map(l => ({
          id: l.id,
          checked_at: l.checked_at,
          status: 'down' as const,
          response_time: l.response_time,
          status_code: l.status_code,
          error_message: l.error_message
        }))

      reports.push({
        site,
        uptimePercent,
        totalChecks,
        upChecks,
        downChecks,
        avgResponseTime,
        minResponseTime,
        maxResponseTime,
        incidents
      })
    }

    setReportData(reports)
    setGenerating(false)
  }

  const downloadCSV = () => {
    if (reportData.length === 0) return

    let csv = 'Site,Date Range,Uptime %,Total Checks,Up,Down,Avg Response (ms),Min Response (ms),Max Response (ms)\n'

    reportData.forEach(report => {
      csv += `"${report.site.url}",${dateRange} days,${report.uptimePercent.toFixed(2)},${report.totalChecks},${report.upChecks},${report.downChecks},${report.avgResponseTime},${report.minResponseTime},${report.maxResponseTime}\n`
    })

    csv += '\n\nIncidents (First 25 per site)\n'
    csv += 'Site,Timestamp,Status Code,Response Time (ms),Error Message\n'

    reportData.forEach(report => {
      report.incidents.forEach(incident => {
        const timestamp = new Date(incident.checked_at).toLocaleString()
        csv += `"${report.site.url}","${timestamp}",${incident.status_code || 'N/A'},${incident.response_time || 'N/A'},"${incident.error_message || 'N/A'}"\n`
      })
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pingbuoy-report-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const printReport = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const availableDateRanges = profile?.plan === 'free' ? [7] : [7, 30, 90]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports</h1>
              <p className="text-gray-600">Generate detailed uptime and performance reports</p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline" className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Report Configuration */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Configuration</h2>

          {/* Site Selection */}
          <div className="mb-6" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Sites
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-left flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="text-sm text-gray-700">
                  {selectedSiteIds.length === 0
                    ? 'Select sites...'
                    : `${selectedSiteIds.length} site${selectedSiteIds.length > 1 ? 's' : ''} selected`}
                </span>
                <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${dropdownOpen ? 'transform rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  <div className="p-2 border-b border-gray-200 flex space-x-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); selectAllSites(); }}
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                    >
                      Select All
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deselectAllSites(); }}
                      className="text-xs px-2 py-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
                    >
                      Deselect All
                    </button>
                  </div>
                  <div className="p-2 space-y-1">
                    {sites.map(site => (
                      <label
                        key={site.id}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSiteIds.includes(site.id)}
                          onChange={() => toggleSiteSelection(site.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{site.url}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Date Range & View Mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div ref={dateRangeRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDateRangeDropdownOpen(!dateRangeDropdownOpen)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-left flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <span className="text-sm text-gray-700">{dateRange} days</span>
                  <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${dateRangeDropdownOpen ? 'transform rotate-180' : ''}`} />
                </button>
                {dateRangeDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
                    {availableDateRanges.map(days => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => {
                          setDateRange(days)
                          setDateRangeDropdownOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                          dateRange === days ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        } first:rounded-t-lg last:rounded-b-lg`}
                      >
                        {days} days
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {profile?.plan === 'free' && (
                <p className="text-xs text-gray-500 mt-1">
                  Upgrade to Pro for 30 and 90-day reports
                </p>
              )}
            </div>

            <div ref={viewModeRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                View Mode
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setViewModeDropdownOpen(!viewModeDropdownOpen)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-left flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <span className="text-sm text-gray-700 capitalize">{viewMode}</span>
                  <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${viewModeDropdownOpen ? 'transform rotate-180' : ''}`} />
                </button>
                {viewModeDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
                    {(['daily', 'weekly', 'monthly'] as const).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setViewMode(mode)
                          setViewModeDropdownOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 capitalize ${
                          viewMode === mode ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        } first:rounded-t-lg last:rounded-b-lg`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={generateReport}
            disabled={selectedSiteIds.length === 0 || generating}
            className="w-full"
          >
            {generating ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>

        {/* Export Buttons */}
        {reportData.length > 0 && (
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-4 mb-8 print:hidden">
            <div className="flex space-x-4">
              <Button onClick={printReport} variant="outline" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Print / Save as PDF</span>
              </Button>
              <Button onClick={downloadCSV} variant="outline" className="flex items-center space-x-2">
                <Download className="h-4 w-4" />
                <span>Download CSV</span>
              </Button>
            </div>
          </div>
        )}

        {/* Report Display */}
        {reportData.length > 0 && (
          <div ref={reportRef} className="space-y-8">
            {reportData.map(report => (
              <div key={report.site.id} className="bg-white shadow-sm border border-gray-200 rounded-lg p-6 break-inside-avoid">
                {/* Site Header */}
                <div className="border-b border-gray-200 pb-4 mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">{report.site.url}</h2>
                  <p className="text-sm text-gray-500">Report for last {dateRange} days</p>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Uptime</p>
                    <p className="text-2xl font-bold text-green-600">{report.uptimePercent.toFixed(2)}%</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total Checks</p>
                    <p className="text-2xl font-bold text-blue-600">{report.totalChecks}</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Avg Response</p>
                    <p className="text-2xl font-bold text-yellow-600">{report.avgResponseTime}ms</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Incidents</p>
                    <p className="text-2xl font-bold text-red-600">{report.incidents.length}</p>
                  </div>
                </div>

                {/* Response Time Stats */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Response Times</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Average</p>
                      <p className="text-xl font-semibold text-gray-900">{report.avgResponseTime}ms</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Minimum</p>
                      <p className="text-xl font-semibold text-gray-900">{report.minResponseTime}ms</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Maximum</p>
                      <p className="text-xl font-semibold text-gray-900">{report.maxResponseTime}ms</p>
                    </div>
                  </div>
                </div>

                {/* Incidents Table */}
                {report.incidents.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Incidents (Showing first {report.incidents.length} of {report.downChecks})
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Timestamp
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status Code
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Response Time
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Error
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {report.incidents.map(incident => (
                            <tr key={incident.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(incident.checked_at).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {incident.status_code || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {incident.response_time ? `${incident.response_time}ms` : 'N/A'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {incident.error_message || 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {report.incidents.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No incidents in this period</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {reportData.length === 0 && !generating && (
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-12 text-center">
            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Generated</h3>
            <p className="text-gray-500">Select sites and click Generate Report to view metrics</p>
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            background: white;
          }
          .break-inside-avoid {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}
