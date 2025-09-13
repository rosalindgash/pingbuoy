import Link from 'next/link'
import { AlertTriangle, ExternalLink, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getDeadLinks, getScans } from '@/lib/deadlinks'
import { Database } from '@/lib/supabase'

type Site = Database['public']['Tables']['sites']['Row']

interface DeadLinksOverviewProps {
  sites: Site[]
}

export default async function DeadLinksOverview({ sites }: DeadLinksOverviewProps) {
  if (sites.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto w-24 h-24 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No websites to scan
        </h3>
        <p className="text-gray-600">
          Add some websites to your dashboard to start scanning for dead links.
        </p>
      </div>
    )
  }

  const sitesWithStats = await Promise.all(
    sites.map(async (site) => {
      const [deadLinks, scans] = await Promise.all([
        getDeadLinks(site.id),
        getScans(site.id)
      ])
      
      const lastScan = scans[0]
      const brokenLinks = deadLinks.filter(link => !link.fixed).length
      
      return {
        ...site,
        brokenLinks,
        lastScan,
        totalDeadLinks: deadLinks.length
      }
    })
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sitesWithStats.map((site) => (
        <div
          key={site.id}
          className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                site.brokenLinks === 0 ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <h3 className="font-medium text-gray-900 truncate">
                {site.name}
              </h3>
            </div>
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Broken Links</span>
              <span className={`text-sm font-medium ${
                site.brokenLinks === 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {site.brokenLinks}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Last Scan</span>
              <span className="text-sm text-gray-900">
                {site.lastScan 
                  ? new Date(site.lastScan.started_at).toLocaleDateString()
                  : 'Never'
                }
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <span className={`text-sm font-medium ${
                site.lastScan?.status === 'completed' ? 'text-green-600' :
                site.lastScan?.status === 'running' ? 'text-blue-600' :
                site.lastScan?.status === 'failed' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {site.lastScan?.status || 'Not scanned'}
              </span>
            </div>
          </div>

          <Link href={`/dashboard/dead-links/${site.id}`}>
            <Button variant="outline" size="sm" className="w-full">
              <Search className="w-4 h-4 mr-2" />
              View Details
            </Button>
          </Link>
        </div>
      ))}
    </div>
  )
}