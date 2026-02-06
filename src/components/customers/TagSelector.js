'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import CreateTagModal from './CreateTagModal'

export default function TagSelector({ selectedTagIds = [], onChange }) {
  const [availableTags, setAvailableTags] = useState([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef(null)

  // Fetch available tags
  useEffect(() => {
    fetchTags()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchTags = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('customer_tags')
        .select('*')
        .eq('is_active', true)
        .order('tag_name', { ascending: true })

      if (error) throw error

      setAvailableTags(data || [])
    } catch (error) {
      console.error('Error fetching tags:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTagToggle = (tagId) => {
    const newSelectedIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId]

    onChange(newSelectedIds)
  }

  const handleRemoveTag = (tagId) => {
    onChange(selectedTagIds.filter(id => id !== tagId))
  }

  const handleTagCreated = (newTag) => {
    // Add new tag to available tags
    setAvailableTags(prev => [...prev, newTag].sort((a, b) => a.tag_name.localeCompare(b.tag_name)))

    // Auto-select the newly created tag
    onChange([...selectedTagIds, newTag.tag_id])
  }

  const getSelectedTags = () => {
    return availableTags.filter(tag => selectedTagIds.includes(tag.tag_id))
  }

  return (
    <div className="w-full">
      {/* Selected Tags Pills */}
      {selectedTagIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {getSelectedTags().map(tag => (
            <div
              key={tag.tag_id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
              style={{
                backgroundColor: `${tag.tag_color}20`,
                color: tag.tag_color
              }}
            >
              <span>{tag.tag_name}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(tag.tag_id)}
                className="hover:opacity-70 transition-opacity"
                aria-label={`Remove ${tag.tag_name}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between hover:border-gray-400 transition-colors"
        >
          <span className="text-gray-700">
            {selectedTagIds.length > 0
              ? `${selectedTagIds.length} tag${selectedTagIds.length > 1 ? 's' : ''} selected`
              : 'Select tags...'}
          </span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
              </div>
            ) : availableTags.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No tags available
              </div>
            ) : (
              <>
                {/* Tag Options */}
                <div className="py-1">
                  {availableTags.map(tag => (
                    <label
                      key={tag.tag_id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTagIds.includes(tag.tag_id)}
                        onChange={() => handleTagToggle(tag.tag_id)}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.tag_color }}
                      />
                      <span className="text-sm text-gray-700 flex-1">{tag.tag_name}</span>
                    </label>
                  ))}
                </div>

                {/* Create New Tag Button */}
                <div className="border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false)
                      setIsModalOpen(true)
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-green-600 hover:bg-green-50 transition-colors text-sm font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create New Tag
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Create Tag Modal */}
      <CreateTagModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTagCreated={handleTagCreated}
      />
    </div>
  )
}
