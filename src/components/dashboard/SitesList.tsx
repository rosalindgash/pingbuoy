import { formatDistanceToNow } from 'date-fns'
import { ExternalLink, AlertCircle, CheckCircle } from 'lucide-react'
import { getSiteUptimeStats } from '@/lib/uptime'
import UptimeChart from './UptimeChart'
import DeleteSiteButton from './DeleteSiteButton'
import { Database } from '@/lib/supabase'

type Site = Database['public']['Tables']['sites']['Row']

interface SitesListProps {
  sites: Site[]
}

export default async function SitesList({ sites }: SitesListProps) {
  const sitesWithStats = await Promise.all(
    sites.map(async (site) => {
      const stats = await getSiteUptimeStats(site.id)
      return { ...site, stats }
    })
  )

  return (
    <div className="space-y-6">
      {sitesWithStats.map((site) => (
        <div
          key={site.id}
          className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {site.status === 'up' ? (
                  <CheckCircle className="w-5 h-5 text-[#10B981]" />
                ) : site.status === 'down' ? (
                  <AlertCircle className="w-5 h-5 text-[#DC2626]" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gray-300" />
                )}
                <h3 className="text-lg font-medium text-[#111827]">
                  {site.name}
                </h3>
              </div>
              <a
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#111827]/60 hover:text-[#111827]"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {site.stats.uptime}%
                </div>
                <div className="text-sm text-gray-500">30-day uptime</div>
              </div>
              <DeleteSiteButton siteId={site.id} siteName={site.name} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg">
              <div className="text-sm font-medium text-[#111827]/60">Status</div>
              <div className={`text-lg font-semibold ${
                site.status === 'up' ? 'text-[#10B981]' : 
                site.status === 'down' ? 'text-[#DC2626]' : 
                'text-[#111827]/60'
              }`}>
                {site.status === 'up' ? 'Online' : 
                 site.status === 'down' ? 'Offline' : 
                 'Unknown'}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg">
              <div className="text-sm font-medium text-[#111827]/60">Last Checked</div>
              <div className="text-lg font-semibold text-[#111827]">
                {site.last_checked 
                  ? formatDistanceToNow(new Date(site.last_checked), { addSuffix: true })
                  : 'Never'
                }
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500">Total Checks</div>
              <div className="text-lg font-semibold text-[#111827]">
                {site.stats.total}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-sm font-medium text-gray-500 mb-2">
              Recent Activity (24 hours)
            </div>
            <UptimeChart siteId={site.id} />
          </div>

          <div className="text-sm text-gray-600">
            <span className="font-medium">URL:</span> {site.url}
          </div>
        </div>
      ))}
    </div>
  )
}