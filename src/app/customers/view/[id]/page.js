'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ViewCustomerPage() {
  const router = useRouter()
  const params = useParams()
  const customerId = params.id

  const [customer, setCustomer] = useState(null)
  const [tagLookup, setTagLookup] = useState({})
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchCustomer()
  }, [customerId])

  const fetchCustomer = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('customer_id', customerId)
        .eq('is_deleted', false)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          setNotFound(true)
        } else {
          throw error
        }
        return
      }

      setCustomer(data)

      // Fetch tags if customer has any
      if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
        await fetchTags(data.tags)
      }
    } catch (err) {
      console.error('Error fetching customer:', err)
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  const fetchTags = async (tagIds) => {
    try {
      const { data, error } = await supabase
        .from('customer_tags')
        .select('tag_id, tag_name, tag_color')
        .in('tag_id', tagIds)
        .eq('is_active', true)

      if (error) throw error

      const lookup = {}
      data?.forEach(tag => {
        lookup[tag.tag_id] = {
          name: tag.tag_name,
          color: tag.tag_color
        }
      })

      setTagLookup(lookup)
    } catch (err) {
      console.error('Error fetching tags:', err)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const formatCurrency = (amount) => {
    if (!amount) return '₹0'
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const getTagStyles = (hexColor) => {
    if (!hexColor || !hexColor.startsWith('#')) {
      return { backgroundColor: '#e5e7eb', color: '#374151' }
    }

    const r = parseInt(hexColor.slice(1, 3), 16)
    const g = parseInt(hexColor.slice(3, 5), 16)
    const b = parseInt(hexColor.slice(5, 7), 16)

    const bgR = Math.round(r + (255 - r) * 0.85)
    const bgG = Math.round(g + (255 - g) * 0.85)
    const bgB = Math.round(b + (255 - b) * 0.85)

    const textR = Math.round(r * 0.6)
    const textG = Math.round(g * 0.6)
    const textB = Math.round(b * 0.6)

    return {
      backgroundColor: `rgb(${bgR}, ${bgG}, ${bgB})`,
      color: `rgb(${textR}, ${textG}, ${textB})`
    }
  }

  const getCustomerTypeBadge = (type) => {
    const badges = {
      retail: 'bg-blue-100 text-blue-700',
      wholesale: 'bg-purple-100 text-purple-700',
      distributor: 'bg-green-100 text-green-700',
    }
    return badges[type] || 'bg-gray-100 text-gray-700'
  }

  const getMapUrl = () => {
    // Prefer lat_long over google_maps_code
    if (customer.lat_long) {
      // Assuming lat_long is stored as "latitude,longitude" string or object {lat, long}
      const latLong = typeof customer.lat_long === 'string'
        ? customer.lat_long
        : `${customer.lat_long.lat},${customer.lat_long.long}`
      return `https://www.google.com/maps?q=${latLong}`
    } else if (customer.google_maps_code) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.google_maps_code)}`
    }
    return null
  }

  const copyCustomerDetails = () => {
    const mapUrl = getMapUrl()
    const details = `Name: ${customer.customer_name}
Phone: ${customer.phone ? `${customer.country_code || '+91'}${customer.phone}` : 'Not provided'}
Address:
${customer.address_line1 || ''}
${customer.address_line2 || ''}
${customer.landmark ? `Near ${customer.landmark}` : ''}
${customer.city || ''}${customer.state ? `, ${customer.state}` : ''}${customer.pincode ? ` - ${customer.pincode}` : ''}${mapUrl ? `\nGoogle Map Location: ${mapUrl}` : ''}`

    navigator.clipboard.writeText(details.trim()).then(() => {
      const toast = document.createElement('div')
      toast.className = 'fixed top-4 right-4 px-6 py-3 rounded-2xl shadow-lg text-white z-50 bg-emerald-600'
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

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('customer_id', customerId)

      if (error) throw error

      // Show success toast
      const toast = document.createElement('div')
      toast.className = 'fixed top-4 right-4 px-6 py-3 rounded-2xl shadow-lg text-white z-50 bg-emerald-600'
      toast.textContent = 'Customer deleted successfully'
      document.body.appendChild(toast)

      setTimeout(() => {
        toast.style.opacity = '0'
        setTimeout(() => document.body.removeChild(toast), 300)
      }, 2000)

      // Navigate back to customers list
      setTimeout(() => {
        router.push('/customers')
      }, 1500)
    } catch (err) {
      console.error('Error deleting customer:', err)

      const toast = document.createElement('div')
      toast.className = 'fixed top-4 right-4 px-6 py-3 rounded-2xl shadow-lg text-white z-50 bg-red-600'
      toast.textContent = 'Failed to delete customer'
      document.body.appendChild(toast)

      setTimeout(() => {
        toast.style.opacity = '0'
        setTimeout(() => document.body.removeChild(toast), 300)
      }, 3000)
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  // Skeleton Loader
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-32 h-5 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border-2 border-gray-200 p-4">
              <div className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-3"></div>
              <div className="space-y-2">
                <div className="w-full h-3 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-3/4 h-3 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </main>
      </div>
    )
  }

  // 404 Not Found
  if (notFound || !customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
          <p className="text-xl text-gray-600 mb-8">Customer not found</p>
          <button
            onClick={() => router.push('/customers')}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
          >
            Back to Customers
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-800 truncate px-2">{customer.customer_name}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={copyCustomerDetails}
              className="flex items-center gap-1.5 text-gray-500 hover:text-emerald-600 transition-colors"
              title="Copy details"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => router.push(`/customers/edit/${customer.customer_id}`)}
              className="flex items-center gap-1.5 text-gray-500 hover:text-emerald-600 transition-colors"
              title="Edit customer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Contact Info */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contact</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Phone</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {customer.phone ? `${customer.country_code || '+91'} ${customer.phone}` : 'Not provided'}
                </span>
                {customer.phone && (
                  <>
                    <a
                      href={`tel:${customer.country_code || '+91'}${customer.phone}`}
                      className="text-blue-600 hover:text-blue-700"
                      title="Call"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </a>
                    {customer.whatsapp_consent && (
                      <a
                        href={`https://wa.me/${customer.country_code || '+91'}${customer.phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:text-emerald-700"
                        title="WhatsApp"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
            {customer.email && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Email</span>
                <span className="text-sm font-medium text-gray-900">{customer.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Address */}
        {(customer.address_line1 || customer.city || customer.pincode) && (
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</div>
              {getMapUrl() && (
                <a
                  href={getMapUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700"
                  title="Open in Google Maps"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </a>
              )}
            </div>
            <div className="space-y-1 text-sm text-gray-700">
              {customer.address_line1 && <p>{customer.address_line1}</p>}
              {customer.address_line2 && <p>{customer.address_line2}</p>}
              {customer.landmark && <p>Near {customer.landmark}</p>}
              {(customer.city || customer.state || customer.pincode) && (
                <p className="pt-1">
                  {customer.city && `${customer.city}`}
                  {customer.state && `, ${customer.state}`}
                  {customer.pincode && ` - ${customer.pincode}`}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Details */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 space-y-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</div>

          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Type</span>
            <div className="mt-1">
              <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${getCustomerTypeBadge(customer.customer_type)}`}>
                {customer.customer_type || 'retail'}
              </span>
            </div>
          </div>

          {customer.tags && Array.isArray(customer.tags) && customer.tags.length > 0 && (
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Tags</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {customer.tags.map((tagId) => {
                  const tagInfo = tagLookup[tagId]
                  if (!tagInfo) return null

                  const tagStyles = getTagStyles(tagInfo.color)

                  return (
                    <span
                      key={tagId}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium"
                      style={tagStyles}
                    >
                      {tagInfo.name}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {customer.notes && (
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Notes</span>
              <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{customer.notes}</p>
            </div>
          )}
        </div>

        {/* Order Stats */}
        {customer.total_orders > 0 && (
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Order History</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-500">First Order</span>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDate(customer.first_order_date)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Last Order</span>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDate(customer.last_order_date)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Total Orders</span>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{customer.total_orders}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Total Spent</span>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{formatCurrency(customer.total_spent)}</p>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-gray-500">Average Order Value</span>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{formatCurrency(customer.average_order_value)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Delete Button */}
        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-full py-2.5 rounded-xl border-2 border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
        >
          Delete Customer
        </button>
      </main>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Customer</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete <strong>{customer.customer_name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
