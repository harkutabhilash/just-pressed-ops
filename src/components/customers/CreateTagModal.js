'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const COLOR_ROTATION = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#8B5CF6', // violet-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
  '#84CC16', // lime-500
  '#F97316', // orange-500
  '#6366F1', // indigo-500
]

export default function CreateTagModal({ isOpen, onClose, onTagCreated }) {
  const [tagName, setTagName] = useState('')
  const [assignedColor, setAssignedColor] = useState(COLOR_ROTATION[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Auto-assign color based on existing tag count
  useEffect(() => {
    if (isOpen) {
      fetchTagCountAndAssignColor()
    }
  }, [isOpen])

  const fetchTagCountAndAssignColor = async () => {
    try {
      const { count, error } = await supabase
        .from('customer_tags')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      if (error) throw error

      // Assign color based on rotation
      const colorIndex = (count || 0) % COLOR_ROTATION.length
      setAssignedColor(COLOR_ROTATION[colorIndex])
    } catch (err) {
      console.error('Error fetching tag count:', err)
      // Default to first color on error
      setAssignedColor(COLOR_ROTATION[0])
    }
  }

  const showToast = (message, type = 'success') => {
    // Create toast element
    const toast = document.createElement('div')
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 transition-opacity ${
      type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`
    toast.textContent = message
    document.body.appendChild(toast)

    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.opacity = '0'
      setTimeout(() => document.body.removeChild(toast), 300)
    }, 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!tagName.trim()) {
      setError('Tag name is required')
      return
    }

    // Check for duplicate tag name before saving
    try {
      const { data: existingTag } = await supabase
        .from('customer_tags')
        .select('tag_name')
        .ilike('tag_name', tagName.trim())
        .single()

      if (existingTag) {
        setError('A tag with this name already exists')
        showToast('A tag with this name already exists', 'error')
        return
      }
    } catch (err) {
      // PGRST116 means no rows returned, which is what we want
      if (err.code !== 'PGRST116') {
        console.error('Error checking for duplicate:', err)
      }
    }

    setSaving(true)

    try {
      const { data, error } = await supabase
        .from('customer_tags')
        .insert([
          {
            tag_name: tagName.trim(),
            tag_color: assignedColor,
            is_active: true
          }
        ])
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          setError('A tag with this name already exists')
          showToast('A tag with this name already exists', 'error')
        } else {
          throw error
        }
        return
      }

      // Show success toast
      showToast(`Tag "${data.tag_name}" created successfully!`, 'success')

      // Reset form
      setTagName('')

      // Notify parent and close
      onTagCreated(data)
      onClose()
    } catch (err) {
      console.error('Error creating tag:', err)
      setError('Failed to create tag. Please try again.')
      showToast('Failed to create tag. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setTagName('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Create New Tag</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Tag Name with Color Preview */}
          <div className="mb-6">
            <label htmlFor="tagName" className="block text-sm font-medium text-gray-700 mb-2">
              Tag Name
            </label>
            <div className="relative">
              <input
                id="tagName"
                type="text"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="e.g., VIP, Wholesale, Premium"
                maxLength={50}
                className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                autoFocus
              />
              {/* Color Preview Dot */}
              <div
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-gray-200"
                style={{ backgroundColor: assignedColor }}
                title="Auto-assigned color"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Color will be auto-assigned
            </p>
          </div>

          {/* Preview */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preview
            </label>
            <div className="flex items-center gap-2">
              <span
                className="px-3 py-1.5 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: `${assignedColor}20`,
                  color: assignedColor
                }}
              >
                {tagName || 'Tag Name'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !tagName.trim()}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Creating...' : 'Create Tag'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
