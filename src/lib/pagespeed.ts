/**
 * PageSpeed Insights API integration for Core Web Vitals monitoring
 * Using Google's free API with API key for 50,000 requests/day
 */

import { createServerSupabaseClient } from './supabase-server'
import { Database } from './supabase'
import { strictSSRFDefense, SSRFDefenseError } from './ssrf-defense'

type PerformanceLog = Database['public']['Tables']['performance_logs']['Row']
type PerformanceLogInsert = Database['public']['Tables']['performance_logs']['Insert']

interface PageSpeedInsightsResponse {
  id: string
  loadingExperience?: {
    metrics: {
      LARGEST_CONTENTFUL_PAINT_MS?: { percentile: number }
      FIRST_INPUT_DELAY_MS?: { percentile: number }
      CUMULATIVE_LAYOUT_SHIFT_SCORE?: { percentile: number }
    }
  }
  lighthouseResult: {
    audits: {
      'largest-contentful-paint': { numericValue: number; score: number }
      'first-input-delay': { numericValue: number; score: number }
      'cumulative-layout-shift': { numericValue: number; score: number }
      'first-contentful-paint': { numericValue: number; score: number }
      'server-response-time': { numericValue: number }
      'speed-index': { numericValue: number }
    }
    categories: {
      performance: { score: number }
    }
  }
}

interface CoreWebVitalsResult {
  success: boolean
  error?: string
  data?: {
    // Lab data (Lighthouse)
    lcp: number
    fid: number
    cls: number
    fcp: number
    ttfb: number
    speedIndex: number
    performanceScore: number

    // Field data (Chrome UX Report)
    hasFieldData: boolean
    fieldLcp?: number
    fieldFid?: number
    fieldCls?: number

    // Raw data for storage
    pageStats: any
  }
}

export class PageSpeedService {
  private apiKey: string
  private baseUrl = 'https://www.googleapis.com/pagespeed/v5/runPagespeed'

  constructor() {
    this.apiKey = process.env.GOOGLE_PAGESPEED_API_KEY || ''
    if (!this.apiKey) {
      console.warn('GOOGLE_PAGESPEED_API_KEY not found. PageSpeed Insights will be disabled.')
    }
  }

  /**
   * Run PageSpeed Insights check for a URL
   */
  async checkUrl(url: string, strategy: 'mobile' | 'desktop' = 'mobile'): Promise<CoreWebVitalsResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'PageSpeed Insights API key not configured'
      }
    }

    try {
      // Validate URL with SSRF protection
      const validation = await strictSSRFDefense().validateUrl(url)
      if (!validation.isValid) {
        return {
          success: false,
          error: `URL validation failed: ${validation.reason}`
        }
      }

      // Build API request URL (Google API is trusted)
      const requestUrl = new URL(this.baseUrl)
      requestUrl.searchParams.set('url', url)
      requestUrl.searchParams.set('key', this.apiKey)
      requestUrl.searchParams.set('strategy', strategy)
      requestUrl.searchParams.set('category', 'performance')

      console.log(`Running PageSpeed Insights check for ${url} (${strategy})`)

      // Direct fetch to Google API (trusted external service)
      const response = await fetch(requestUrl.toString(), {
        signal: AbortSignal.timeout(60000),
        headers: {
          'User-Agent': 'PingBuoy/2.0 (+https://pingbuoy.com)'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('PageSpeed Insights API error:', response.status, errorText)
        return {
          success: false,
          error: `API returned ${response.status}: ${errorText}`
        }
      }

      const data: PageSpeedInsightsResponse = await response.json()

      // Extract Core Web Vitals from Lighthouse results
      const audits = data.lighthouseResult.audits
      const loadingExperience = data.loadingExperience

      const result: CoreWebVitalsResult = {
        success: true,
        data: {
          // Lab data (Lighthouse synthetic test)
          lcp: Math.round(audits['largest-contentful-paint']?.numericValue || 0),
          fid: Math.round(audits['first-input-delay']?.numericValue || 0),
          cls: Math.round((audits['cumulative-layout-shift']?.numericValue || 0) * 1000) / 1000,
          fcp: Math.round(audits['first-contentful-paint']?.numericValue || 0),
          ttfb: Math.round(audits['server-response-time']?.numericValue || 0),
          speedIndex: Math.round(audits['speed-index']?.numericValue || 0),
          performanceScore: Math.round((data.lighthouseResult.categories.performance.score || 0) * 100),

          // Field data (real user metrics from Chrome UX Report)
          hasFieldData: !!loadingExperience,
          fieldLcp: loadingExperience?.metrics.LARGEST_CONTENTFUL_PAINT_MS?.percentile,
          fieldFid: loadingExperience?.metrics.FIRST_INPUT_DELAY_MS?.percentile,
          fieldCls: loadingExperience?.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile,

          // Store raw data for detailed analysis
          pageStats: {
            id: data.id,
            lighthouseVersion: data.lighthouseResult.lighthouseVersion,
            audits: Object.keys(audits).reduce((acc, key) => {
              acc[key] = {
                score: audits[key].score,
                numericValue: audits[key].numericValue
              }
              return acc
            }, {} as any)
          }
        }
      }

      return result

    } catch (error) {
      console.error('PageSpeed Insights check failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Run performance check and save to database
   */
  async checkAndLog(siteId: string, url: string, userId: string, strategy: 'mobile' | 'desktop' = 'mobile'): Promise<PerformanceLog | null> {
    const result = await this.checkUrl(url, strategy)

    const logEntry: PerformanceLogInsert = {
      site_id: siteId,
      user_id: userId,
      strategy,
      status: result.success ? 'success' : 'failed',
      error_message: result.error || null,
      checked_at: new Date().toISOString(),
    }

    if (result.success && result.data) {
      const data = result.data
      Object.assign(logEntry, {
        lcp: data.lcp,
        fid: data.fid,
        cls: data.cls,
        fcp: data.fcp,
        ttfb: data.ttfb,
        speed_index: data.speedIndex,
        performance_score: data.performanceScore,
        has_field_data: data.hasFieldData,
        field_lcp: data.fieldLcp || null,
        field_fid: data.fieldFid || null,
        field_cls: data.fieldCls || null,
        page_stats: data.pageStats
      })
    }

    try {
      const supabase = await createServerSupabaseClient()
      const { data: savedLog, error } = await supabase
        .from('performance_logs')
        .insert(logEntry)
        .select()
        .single()

      if (error) {
        console.error('Failed to save performance log:', error)
        return null
      }

      return savedLog
    } catch (error) {
      console.error('Database error saving performance log:', error)
      return null
    }
  }

  /**
   * Get recent performance logs for a site
   */
  async getSitePerformanceLogs(siteId: string, limit = 30, strategy?: 'mobile' | 'desktop'): Promise<PerformanceLog[]> {
    try {
      const supabase = await createServerSupabaseClient()

      let query = supabase
        .from('performance_logs')
        .select('*')
        .eq('site_id', siteId)
        .order('checked_at', { ascending: false })
        .limit(limit)

      if (strategy) {
        query = query.eq('strategy', strategy)
      }

      const { data, error } = await query

      if (error) {
        console.error('Failed to fetch performance logs:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Database error fetching performance logs:', error)
      return []
    }
  }

  /**
   * Get performance summary for a site (last 30 days)
   */
  async getSitePerformanceSummary(siteId: string, strategy: 'mobile' | 'desktop' = 'mobile') {
    try {
      const supabase = await createServerSupabaseClient()

      const { data, error } = await supabase
        .from('performance_logs')
        .select('lcp, fid, cls, performance_score, checked_at')
        .eq('site_id', siteId)
        .eq('strategy', strategy)
        .gte('checked_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('checked_at', { ascending: false })

      if (error) {
        console.error('Failed to fetch performance summary:', error)
        return null
      }

      if (!data || data.length === 0) {
        return null
      }

      const latest = data[0]
      const avgScore = Math.round(data.reduce((sum, log) => sum + (log.performance_score || 0), 0) / data.length)

      return {
        latest: {
          lcp: latest.lcp,
          fid: latest.fid,
          cls: latest.cls,
          performanceScore: latest.performance_score,
          checkedAt: latest.checked_at
        },
        average: {
          performanceScore: avgScore
        },
        totalChecks: data.length
      }
    } catch (error) {
      console.error('Database error fetching performance summary:', error)
      return null
    }
  }
}

// Export singleton instance
export const pageSpeedService = new PageSpeedService()

// Convenience functions
export const checkUrlPerformance = (url: string, strategy?: 'mobile' | 'desktop') =>
  pageSpeedService.checkUrl(url, strategy)

export const checkAndLogPerformance = (siteId: string, url: string, userId: string, strategy?: 'mobile' | 'desktop') =>
  pageSpeedService.checkAndLog(siteId, url, userId, strategy)

export const getSitePerformanceLogs = (siteId: string, limit?: number, strategy?: 'mobile' | 'desktop') =>
  pageSpeedService.getSitePerformanceLogs(siteId, limit, strategy)

export const getSitePerformanceSummary = (siteId: string, strategy?: 'mobile' | 'desktop') =>
  pageSpeedService.getSitePerformanceSummary(siteId, strategy)