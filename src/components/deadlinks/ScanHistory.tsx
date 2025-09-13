import { formatDistanceToNow } from 'date-fns'
import { Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Database } from '@/lib/supabase'

type Scan = Database['public']['Tables']['scans']['Row']

interface ScanHistoryProps {
  scans: Scan[]
}

export default function ScanHistory({ scans }: ScanHistoryProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50'
      case 'failed':
        return 'text-red-600 bg-red-50'
      case 'running':
        return 'text-blue-600 bg-blue-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Scan History</h3>
      </div>
      
      {scans.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          No scans yet
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {scans.map((scan) => (
            <div key={scan.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(scan.status)}
                  <span className={`text-sm font-medium px-2 py-1 rounded-full ${getStatusColor(scan.status)}`}>
                    {scan.status}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(scan.started_at), { addSuffix: true })}
                </span>
              </div>
              
              {scan.status === 'completed' && (
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Total Links: {scan.total_links}</div>
                  <div>Broken Links: {scan.broken_links}</div>
                  {scan.completed_at && (
                    <div>
                      Duration: {Math.round(
                        (new Date(scan.completed_at).getTime() - new Date(scan.started_at).getTime()) / 1000
                      )}s
                    </div>
                  )}
                </div>
              )}
              
              {scan.status === 'failed' && (
                <div className="text-sm text-red-600">
                  Scan failed. Please try again.
                </div>
              )}
              
              {scan.status === 'running' && (
                <div className="text-sm text-blue-600">
                  Scan in progress...
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}