'use client'

import { useState } from 'react'
import { Link2, X, Image as ImageIcon, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface SiteLogoLinkProps {
  siteId: string
  siteName: string
  currentLogoUrl?: string | null
  userPlan: 'free' | 'pro' | 'founder'
  onLogoUpdate: (logoUrl: string | null) => void
}

export default function SiteLogoLink({
  siteId,
  siteName,
  currentLogoUrl,
  userPlan,
  onLogoUpdate
}: SiteLogoLinkProps) {
  const [editing, setEditing] = useState(false)
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only show for Pro/Founder users
  if (userPlan === 'free') {
    return null
  }

  const validateUrl = (url: string) => {
    try {
      new URL(url)
      return url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)
    } catch {
      return false
    }
  }

  const saveLogo = async () => {
    try {
      setSaving(true)
      setError(null)

      const trimmedUrl = logoUrl.trim()

      // Validate URL if provided
      if (trimmedUrl && !validateUrl(trimmedUrl)) {
        setError('Please enter a valid image URL (jpg, png, gif, svg, webp)')
        return
      }

      // Update site record
      const { error: updateError } = await supabase
        .from('sites')
        .update({ logo_url: trimmedUrl || null })
        .eq('id', siteId)

      if (updateError) {
        throw updateError
      }

      onLogoUpdate(trimmedUrl || null)
      setEditing(false)

    } catch (error) {
      console.error('Error updating logo URL:', error)
      setError(error instanceof Error ? error.message : 'Failed to update logo URL')
    } finally {
      setSaving(false)
    }
  }

  const removeLogo = async () => {
    setLogoUrl('')
    try {
      setSaving(true)
      setError(null)

      const { error: updateError } = await supabase
        .from('sites')
        .update({ logo_url: null })
        .eq('id', siteId)

      if (updateError) {
        throw updateError
      }

      onLogoUpdate(null)
      setEditing(false)

    } catch (error) {
      console.error('Error removing logo URL:', error)
      setError(error instanceof Error ? error.message : 'Failed to remove logo URL')
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    setLogoUrl(currentLogoUrl || '')
    setEditing(false)
    setError(null)
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Site Logo</h3>
          <p className="text-sm text-gray-600">
            Add a logo URL for your status page (Pro feature)
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
            {userPlan.toUpperCase()}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Current Logo Preview */}
        {currentLogoUrl && !editing ? (
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="relative w-16 h-16 flex-shrink-0">
              <Image
                src={currentLogoUrl}
                alt={`${siteName} logo`}
                fill
                className="object-contain rounded-lg"
                onError={() => setError('Failed to load logo image')}
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Current Logo</p>
              <p className="text-xs text-gray-500 truncate">{currentLogoUrl}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
                disabled={saving}
              >
                <Link2 className="w-4 h-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={removeLogo}
                disabled={saving}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : editing ? (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo Image URL
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={saving}
              />
            </div>

            {logoUrl && validateUrl(logoUrl) && (
              <div className="flex items-center space-x-2">
                <div className="relative w-12 h-12">
                  <Image
                    src={logoUrl}
                    alt="Logo preview"
                    fill
                    className="object-contain rounded"
                    onError={() => setError('Invalid image URL or image failed to load')}
                  />
                </div>
                <span className="text-sm text-green-600">Preview</span>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                onClick={saveLogo}
                disabled={saving}
                className="flex items-center"
              >
                <Check className="w-4 h-4 mr-1" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={cancelEdit}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center">
              <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-4">No logo URL added</p>
              <Button
                variant="outline"
                onClick={() => setEditing(true)}
                className="flex items-center"
              >
                <Link2 className="w-4 h-4 mr-2" />
                Add Logo URL
              </Button>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Use any publicly accessible image URL</p>
          <p>• Supported formats: JPEG, PNG, GIF, SVG, WebP</p>
          <p>• Recommended: Host on reliable image hosting services</p>
          <p>• Square images work best (256x256px or larger)</p>
          <p>• Logo will appear in your public status page header</p>
        </div>
      </div>
    </div>
  )
}