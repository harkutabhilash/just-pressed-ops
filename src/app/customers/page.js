'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ITEMS_PER_PAGE = 20

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [searchMatchType, setSearchMatchType] = useState(null) // 'name' or 'phone'
  const [tagLookup, setTagLookup] = useState({}) // Map of tag_id to tag details
  const observerTarget = useRef(null)
  const debounceTimer = useRef(null)

  // Fetch tag details by IDs
  const fetchTags = useCallback(async (tagIds) => {
    if (!tagIds || tagIds.length === 0) return {}

    try {
      const { data, error } = await supabase
        .from('customer_tags')
        .select('tag_id, tag_name, tag_color')
        .in('tag_id', tagIds)
        .eq('is_active', true)

      if (error) throw error

      // Create lookup map: tag_id -> { tag_name, tag_color }
      const lookup = {}
      data?.forEach(tag => {
        lookup[tag.tag_id] = {
          name: tag.tag_name,
          color: tag.tag_color
        }
      })

      return lookup
    } catch (error) {
      console.error('Error fetching tags:', error)
      return {}
    }
  }, [])

  // Fetch customers with pagination
  const fetchCustomers = useCallback(async (offset = 0, query = '', isNewSearch = false) => {
    try {
      if (offset === 0) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      let supabaseQuery = supabase
        .from('customers')
        .select('*')
        .eq('is_deleted', false)
        .eq('is_active', true)
        .order('customer_name', { ascending: true })

      // Apply search filter
      if (query.trim()) {
        const searchTerm = query.trim()
        // Search in both phone and name
        supabaseQuery = supabaseQuery.or(`phone.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%`)
      }

      const { data, error } = await supabaseQuery
        .range(offset, offset + ITEMS_PER_PAGE - 1)

      if (error) throw error

      // Determine match type for search results
      if (query.trim() && data && data.length > 0) {
        const searchTerm = query.trim().toLowerCase()
        const firstMatch = data[0]

        if (firstMatch.phone && firstMatch.phone.toLowerCase().includes(searchTerm)) {
          setSearchMatchType('phone')
        } else if (firstMatch.customer_name && firstMatch.customer_name.toLowerCase().includes(searchTerm)) {
          setSearchMatchType('name')
        }
      } else {
        setSearchMatchType(null)
      }

      // Extract all unique tag IDs from the fetched customers
      const allTagIds = new Set()
      data?.forEach(customer => {
        if (Array.isArray(customer.tags)) {
          customer.tags.forEach(tagId => allTagIds.add(tagId))
        }
      })

      // Fetch tag details if there are any tag IDs
      if (allTagIds.size > 0) {
        const newTags = await fetchTags(Array.from(allTagIds))
        setTagLookup(prev => ({ ...prev, ...newTags }))
      }

      if (isNewSearch) {
        setCustomers(data || [])
      } else {
        setCustomers(prev => [...prev, ...(data || [])])
      }

      setHasMore(data && data.length === ITEMS_PER_PAGE)
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [fetchTags])

  // Initial load
  useEffect(() => {
    fetchCustomers(0, searchQuery, true)
  }, [])

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    debounceTimer.current = setTimeout(() => {
      setCustomers([])
      fetchCustomers(0, searchQuery, true)
    }, 300)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [searchQuery, fetchCustomers])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchCustomers(customers.length, searchQuery, false)
        }
      },
      { threshold: 0.1 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [hasMore, loading, loadingMore, customers.length, searchQuery, fetchCustomers])

  // Convert hex color to lighter background and darker text
  const getTagStyles = (hexColor) => {
    if (!hexColor || !hexColor.startsWith('#')) {
      return { backgroundColor: '#e5e7eb', color: '#374151' } // Default gray
    }

    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16)
    const g = parseInt(hexColor.slice(3, 5), 16)
    const b = parseInt(hexColor.slice(5, 7), 16)

    // Create lighter background (mix with white)
    const bgR = Math.round(r + (255 - r) * 0.85)
    const bgG = Math.round(g + (255 - g) * 0.85)
    const bgB = Math.round(b + (255 - b) * 0.85)

    // Create darker text (darken original color)
    const textR = Math.round(r * 0.6)
    const textG = Math.round(g * 0.6)
    const textB = Math.round(b * 0.6)

    return {
      backgroundColor: `rgb(${bgR}, ${bgG}, ${bgB})`,
      color: `rgb(${textR}, ${textG}, ${textB})`
    }
  }

  const getMapUrl = (customer) => {
    // Prefer lat_long over google_maps_code
    if (customer.lat_long) {
      const latLong = typeof customer.lat_long === 'string'
        ? customer.lat_long
        : `${customer.lat_long.lat},${customer.lat_long.long}`
      return `https://www.google.com/maps?q=${latLong}`
    } else if (customer.google_maps_code) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.google_maps_code)}`
    }
    return null
  }

  const copyCustomerDetails = (customer, e) => {
    // e.stopPropagation() // Prevent card click navigation

    const mapUrl = getMapUrl(customer)
    const details = `Name: ${customer.customer_name}
Phone: ${customer.phone ? `${customer.country_code || '+91'}${customer.phone}` : 'Not provided'}
Address:
${customer.address_line1 || ''}
${customer.address_line2 || ''}
${customer.landmark ? `Near ${customer.landmark}` : ''}
${customer.city || ''}${customer.state ? `, ${customer.state}` : ''}${customer.pincode ? ` - ${customer.pincode}` : ''}${mapUrl ? `\nGoogle Map Location: ${mapUrl}` : ''}`

    navigator.clipboard.writeText(details.trim()).then(() => {
      const toast = document.createElement('div')
      toast.className = 'fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 bg-green-600'
      toast.textContent = 'Details copied to clipboard!'
      document.body.appendChild(toast)

      setTimeout(() => {
        toast.style.opacity = '0'
        setTimeout(() => document.body.removeChild(toast), 300)
      }, 2000)
    }).catch(err => {
      console.error('Failed to copy:', err)
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700">
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span className="text-sm">Home</span>
          </button>
          <span className="text-sm font-semibold text-gray-800">Customers</span>
          <div className="w-20" />
        </div>
      </header>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-4 py-4 bg-white border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Search Match Type */}
        {searchQuery && searchMatchType && customers.length > 0 && (
          <p className="mt-2 text-sm text-gray-600">
            Match found on {searchMatchType}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          // Loading state
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        ) : customers.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-20">
            <svg
              className="w-24 h-24 text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-gray-500 text-lg">No customers yet. Add your first customer!</p>
          </div>
        ) : (
          // Customer cards
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map((customer) => (
              <div
                key={customer.customer_id}
                onClick={() => router.push(`/customers/view/${customer.customer_id}`)}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer p-4 border border-gray-200 relative"
              >
                {/* Copy Button */}
                <button
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    copyCustomerDetails(customer)
                }}
                className="
                    absolute top-2 right-2
                    p-2 md:p-1
                    rounded-md
                    text-gray-400 hover:text-green-600
                    hover:bg-gray-100 active:bg-gray-200
                    transition
                "
                title="Copy details"
                >
                <svg
                    className="w-5 h-5 md:w-4 md:h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                </svg>
                </button>

                {/* Name */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2 pr-8">
                  {customer.customer_name}
                </h3>

                {/* Phone */}
                <div className="flex items-center text-gray-600 mb-2">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <span className="text-sm">{customer.phone || 'No phone'}</span>
                </div>

                {/* Pincode, City, State */}
                <div className="flex items-center text-gray-600 mb-2">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="text-sm">
                    {customer.pincode ? `${customer.pincode} - ` : ''}
                    {customer.city || 'No city'}
                    {customer.state ? `, ${customer.state}` : ''}
                  </span>
                </div>

                {/* Landmark */}
                {customer.landmark && (
                  <div className="flex items-start text-gray-600 mb-3">
                    <svg
                      className="w-4 h-4 mr-2 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                      />
                    </svg>
                    <span className="text-sm line-clamp-2">{customer.landmark}</span>
                  </div>
                )}

                {/* Tags */}
                {customer.tags && Array.isArray(customer.tags) && customer.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {customer.tags.map((tagId) => {
                      const tagInfo = tagLookup[tagId]
                      if (!tagInfo) return null

                      const tagStyles = getTagStyles(tagInfo.color)

                      return (
                        <span
                          key={tagId}
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={tagStyles}
                        >
                          {tagInfo.name}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Loading more indicator */}
        {loadingMore && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        )}

        {/* Intersection observer target */}
        <div ref={observerTarget} className="h-4" />
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => router.push('/customers/new')}
        className="fixed bottom-6 right-6 w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-20"
        aria-label="Add new customer"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
    </div>
  )
}
