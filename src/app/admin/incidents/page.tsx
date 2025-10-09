'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, Eye, EyeOff, Edit, MessageSquare, ArrowLeft } from 'lucide-react'

interface IncidentUpdate {
  id: string
  status: string
  message: string
  created_at: string
}

interface Incident {
  id: string
  title: string
  description: string
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved'
  impact: 'none' | 'minor' | 'major' | 'critical'
  is_public: boolean
  started_at: string
  resolved_at: string | null
  created_at: string
  updated_at: string
  updates: IncidentUpdate[]
}

export default function AdminIncidentsPage() {
  const router = useRouter()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [showUpdateForm, setShowUpdateForm] = useState(false)

  useEffect(() => {
    fetchIncidents()
  }, [])

  const fetchIncidents = async () => {
    try {
      const response = await fetch('/api/admin/incidents')

      if (response.status === 401) {
        router.push('/admin/incidents/login')
        return
      }

      const data = await response.json()
      setIncidents(data.incidents || [])
    } catch (error) {
      console.error('Failed to fetch incidents:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      investigating: { text: 'Investigating', className: 'bg-yellow-100 text-yellow-800' },
      identified: { text: 'Identified', className: 'bg-orange-100 text-orange-800' },
      monitoring: { text: 'Monitoring', className: 'bg-blue-100 text-blue-800' },
      resolved: { text: 'Resolved', className: 'bg-green-100 text-green-800' }
    }

    const { text, className } = config[status as keyof typeof config] || config.investigating

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
        {text}
      </span>
    )
  }

  const getImpactBadge = (impact: string) => {
    const config = {
      none: { text: 'No Impact', className: 'bg-gray-100 text-gray-800' },
      minor: { text: 'Minor', className: 'bg-blue-100 text-blue-800' },
      major: { text: 'Major', className: 'bg-orange-100 text-orange-800' },
      critical: { text: 'Critical', className: 'bg-red-100 text-red-800' }
    }

    const { text, className } = config[impact as keyof typeof config] || config.none

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
        {text}
      </span>
    )
  }

  const togglePublicStatus = async (incident: Incident) => {
    try {
      const response = await fetch('/api/admin/incidents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: incident.id,
          is_public: !incident.is_public
        })
      })

      if (response.ok) {
        fetchIncidents()
      }
    } catch (error) {
      console.error('Failed to toggle public status:', error)
    }
  }

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading incidents...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Incident Management</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Manage status page incidents and updates</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button variant="outline" className="flex items-center justify-center space-x-2 w-full sm:w-auto">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Button>
            </Link>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-[#F97316] text-white hover:bg-white hover:text-[#F97316] border-2 border-[#F97316] w-full sm:w-auto flex items-center justify-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Incident
            </Button>
          </div>
        </div>

        {showCreateForm && (
          <CreateIncidentForm
            onClose={() => setShowCreateForm(false)}
            onSuccess={() => {
              setShowCreateForm(false)
              fetchIncidents()
            }}
          />
        )}

        {showUpdateForm && selectedIncident && (
          <AddUpdateForm
            incident={selectedIncident}
            onClose={() => {
              setShowUpdateForm(false)
              setSelectedIncident(null)
            }}
            onSuccess={() => {
              setShowUpdateForm(false)
              setSelectedIncident(null)
              fetchIncidents()
            }}
          />
        )}

        <div className="space-y-4">
          {incidents.map((incident) => (
            <div key={incident.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">{incident.title}</h3>
                    {getStatusBadge(incident.status)}
                    {getImpactBadge(incident.impact)}
                    <button
                      onClick={() => togglePublicStatus(incident)}
                      className="ml-auto"
                      title={incident.is_public ? 'Public' : 'Draft'}
                    >
                      {incident.is_public ? (
                        <Eye className="w-4 h-4 text-green-600" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{incident.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Started: {formatDateTime(incident.started_at)}</span>
                    {incident.resolved_at && (
                      <span>Resolved: {formatDateTime(incident.resolved_at)}</span>
                    )}
                    <span className="ml-auto">{incident.updates.length} update(s)</span>
                  </div>
                </div>
              </div>

              {incident.updates.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Updates</h4>
                  <div className="space-y-2">
                    {incident.updates.slice(0, 2).map((update) => (
                      <div key={update.id} className="flex items-start gap-3 text-sm">
                        <div className="flex-shrink-0 mt-1">
                          {getStatusBadge(update.status)}
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-600">{update.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{formatDateTime(update.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t flex gap-2">
                <Button
                  onClick={() => {
                    setSelectedIncident(incident)
                    setShowUpdateForm(true)
                  }}
                  variant="outline"
                  size="sm"
                  className="border-[#F97316] text-[#F97316] hover:bg-[#F97316] hover:text-white"
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Add Update
                </Button>
              </div>
            </div>
          ))}

          {incidents.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-600">No incidents found. Create your first incident to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CreateIncidentForm({
  onClose,
  onSuccess
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'investigating' as 'investigating' | 'identified' | 'monitoring' | 'resolved',
    impact: 'minor' as 'none' | 'minor' | 'major' | 'critical',
    is_public: false
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/admin/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        onSuccess()
      }
    } catch (error) {
      console.error('Failed to create incident:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Incident</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            required
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
            >
              <option value="investigating">Investigating</option>
              <option value="identified">Identified</option>
              <option value="monitoring">Monitoring</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Impact</label>
            <select
              value={formData.impact}
              onChange={(e) => setFormData({ ...formData, impact: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
            >
              <option value="none">No Impact</option>
              <option value="minor">Minor</option>
              <option value="major">Major</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_public"
            checked={formData.is_public}
            onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
            className="h-4 w-4 text-[#F97316] focus:ring-[#F97316] border-gray-300 rounded"
          />
          <label htmlFor="is_public" className="ml-2 block text-sm text-gray-700">
            Make public immediately
          </label>
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={loading}
            className="bg-[#F97316] text-white hover:bg-white hover:text-[#F97316] border-2 border-[#F97316]"
          >
            {loading ? 'Creating...' : 'Create Incident'}
          </Button>
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

function AddUpdateForm({
  incident,
  onClose,
  onSuccess
}: {
  incident: Incident
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    status: incident.status,
    message: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/admin/incidents/${incident.id}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        onSuccess()
      }
    } catch (error) {
      console.error('Failed to add update:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Update to: {incident.title}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
          >
            <option value="investigating">Investigating</option>
            <option value="identified">Identified</option>
            <option value="monitoring">Monitoring</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Update Message</label>
          <textarea
            required
            rows={4}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
            placeholder="Describe the current status or what actions have been taken..."
          />
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={loading}
            className="bg-[#F97316] text-white hover:bg-white hover:text-[#F97316] border-2 border-[#F97316]"
          >
            {loading ? 'Adding...' : 'Add Update'}
          </Button>
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
