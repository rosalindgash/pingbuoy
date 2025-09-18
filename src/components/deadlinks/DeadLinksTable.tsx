'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ExternalLink, Check, Download, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Database } from '@/lib/supabase'

type DeadLink = Database['public']['Tables']['dead_links']['Row']

interface DeadLinksTableProps {
  deadLinks: DeadLink[]
  siteId: string
}

export default function DeadLinksTable({ deadLinks, siteId }: DeadLinksTableProps) {
  const [filter, setFilter] = useState('')
  const [showFixed, setShowFixed] = useState(false)

  const filteredLinks = deadLinks.filter(link => {
    const matchesFilter = !filter || 
      link.url.toLowerCase().includes(filter.toLowerCase()) ||
      link.source_url.toLowerCase().includes(filter.toLowerCase())
    
    const matchesFixedFilter = showFixed || !link.fixed

    return matchesFilter && matchesFixedFilter
  })

  const handleMarkFixed = async (linkId: string) => {
    try {
      const response = await fetch('/api/dead-links/mark-fixed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deadLinkId: linkId }),
      })

      if (response.ok) {
        window.location.reload()
      } else {
        alert('Failed to mark as fixed')
      }
    } catch (_error) {
      alert('An error occurred')
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/dead-links/export?siteId=${siteId}`)
      
      if (response.ok) {
        const csv = await response.text()
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `dead-links-${siteId}-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        alert('Failed to export data')
      }
    } catch (_error) {
      alert('An error occurred during export')
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-medium text-gray-900">
            Broken Links ({filteredLinks.length})
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search links..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={showFixed}
                onChange={(e) => setShowFixed(e.target.checked)}
                className="mr-2"
              />
              Show fixed links
            </label>
            
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {filteredLinks.length === 0 ? (
        <div className="p-8 text-center">
          <div className="text-gray-500">
            {deadLinks.length === 0 
              ? 'No broken links found! 🎉' 
              : 'No links match your current filters.'
            }
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Broken URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Found
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLinks.map((link) => (
                <tr key={link.id} className={link.fixed ? 'opacity-60' : ''}>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <div className="text-sm text-gray-900 truncate max-w-xs">
                        {link.url}
                      </div>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {link.source_url}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        link.status_code >= 400 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {link.status_code || 'Unknown'}
                      </span>
                      {link.fixed && (
                        <Check className="ml-2 w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDistanceToNow(new Date(link.found_at), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4">
                    {!link.fixed && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkFixed(link.id)}
                      >
                        Mark Fixed
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}