'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { lookupPincode } from '@/lib/pincode'
import TagSelector from './TagSelector'

export default function CustomerForm({ mode = 'new', initialData = {}, onSave, onCancel }) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    customer_name: '',
    country_code: '+91',
    phone: '',
    pincode: '',
    address_line1: '',
    address_line2: '',
    lat_long: '',
    google_maps_code: '',
    landmark: '',
    city: '',
    state: '',
    tags: [],
    notes: '',
    ...initialData
  })

  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pincodeLoading, setPincodeLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateCustomer, setDuplicateCustomer] = useState(null)

  // Track dirty state
  useEffect(() => {
    const hasChanges = JSON.stringify(formData) !== JSON.stringify({ ...initialData, country_code: '+91' })
    setIsDirty(hasChanges)
  }, [formData, initialData])

  const showToast = (message, type = 'success') => {
    const toast = document.createElement('div')
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 transition-opacity ${
      type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`
    toast.textContent = message
    document.body.appendChild(toast)

    setTimeout(() => {
      toast.style.opacity = '0'
      setTimeout(() => document.body.removeChild(toast), 300)
    }, 3000)
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  // Phone validation and duplicate check
  const handlePhoneBlur = async () => {
    const phone = formData.phone.trim()

    if (!phone) return

    // Validate 10 digits
    if (!/^\d{10}$/.test(phone)) {
      setErrors(prev => ({ ...prev, phone: 'Phone must be 10 digits' }))
      return
    }

    // Check for duplicates (skip if editing the same customer)
    try {
      let query = supabase
        .from('customers')
        .select('customer_id, customer_name, phone')
        .eq('phone', phone)
        .eq('is_deleted', false)

      // If editing, exclude current customer
      if (mode === 'edit' && initialData.customer_id) {
        query = query.neq('customer_id', initialData.customer_id)
      }

      const { data, error } = await query.single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        // Duplicate found
        setDuplicateCustomer(data)
        setShowDuplicateModal(true)
      }
    } catch (err) {
      console.error('Error checking phone duplicate:', err)
    }
  }

  // Pincode auto-fill
  const handlePincodeBlur = async () => {
    const pincode = formData.pincode.trim()

    if (!pincode) return

    // Validate 6 digits
    if (!/^\d{6}$/.test(pincode)) {
      setErrors(prev => ({ ...prev, pincode: 'Pincode must be 6 digits' }))
      return
    }

    setPincodeLoading(true)

    try {
      const result = await lookupPincode(pincode)

      if (result.error) {
        setErrors(prev => ({ ...prev, pincode: result.error }))
      } else {
        // Auto-fill city and state
        setFormData(prev => ({
          ...prev,
          city: result.city,
          state: result.state
        }))
        // showToast('Location auto-filled from pincode', 'success')
      }
    } catch (err) {
      console.error('Error looking up pincode:', err)
    } finally {
      setPincodeLoading(false)
    }
  }

  // Form validation
  const validateForm = () => {
    const newErrors = {}

    if (!formData.customer_name.trim()) {
      newErrors.customer_name = 'Customer name is required'
    }

    if (formData.phone && !/^\d{10}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Phone must be 10 digits'
    }

    if (formData.pincode && !/^\d{6}$/.test(formData.pincode.trim())) {
      newErrors.pincode = 'Pincode must be 6 digits'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      showToast('Please fix the errors before saving', 'error')
      return
    }

    setSaving(true)

    try {
      const customerData = {
        customer_name: formData.customer_name?.trim() || '',
        country_code: formData.country_code || '+91',
        phone: formData.phone?.trim() || null,
        pincode: formData.pincode?.trim() || null,
        address_line1: formData.address_line1?.trim() || null,
        address_line2: formData.address_line2?.trim() || null,
        lat_long: formData.lat_long?.trim() || null,
        google_maps_code: formData.google_maps_code?.trim() || null,
        landmark: formData.landmark?.trim() || null,
        city: formData.city?.trim() || null,
        state: formData.state?.trim() || null,
        tags: formData.tags || [],
        notes: formData.notes?.trim() || null,
        updated_at: new Date().toISOString()
      }

      let result

      if (mode === 'new') {
        // Create new customer
        const { data, error } = await supabase
          .from('customers')
          .insert([customerData])
          .select()
          .single()

        if (error) throw error
        result = data

        showToast('Customer created successfully!', 'success')
      } else {
        // Update existing customer
        const { data, error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('customer_id', initialData.customer_id)
          .select()
          .single()

        if (error) throw error
        result = data

        showToast('Customer updated successfully!', 'success')
      }

      setIsDirty(false)

      // Call onSave callback
      if (onSave) {
        onSave(result)
      }
    } catch (err) {
      console.error('Error saving customer:', err)
      showToast('Failed to save customer. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Handle cancel with dirty check
  const handleCancel = () => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to cancel?')
      if (!confirmed) return
    }

    if (onCancel) {
      onCancel()
    }
  }

  return (
    <>
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6">
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
          {/* Customer Name */}
          <div>
            <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700 mb-2">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              id="customer_name"
              type="text"
              value={formData.customer_name}
              onChange={(e) => handleChange('customer_name', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                errors.customer_name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter customer name"
              autoFocus
            />
            {errors.customer_name && (
              <p className="mt-1 text-sm text-red-600">{errors.customer_name}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              onBlur={handlePhoneBlur}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="10-digit mobile number"
              maxLength={10}
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
          </div>

          {/* Pincode */}
          <div>
            <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 mb-2">
              Pincode
            </label>
            <div className="relative">
              <input
                id="pincode"
                type="text"
                value={formData.pincode}
                onChange={(e) => handleChange('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                onBlur={handlePincodeBlur}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.pincode ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="6-digit pincode"
                maxLength={6}
              />
              {pincodeLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                </div>
              )}
            </div>
            {errors.pincode && (
              <p className="mt-1 text-sm text-red-600">{errors.pincode}</p>
            )}
          </div>

          {/* Address Line 1 */}
          <div>
            <label htmlFor="address_line1" className="block text-sm font-medium text-gray-700 mb-2">
              Address Line 1
            </label>
            <textarea
              id="address_line1"
              value={formData.address_line1}
              onChange={(e) => handleChange('address_line1', e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Building, Street"
            />
          </div>

          {/* Address Line 2 */}
          <div>
            <label htmlFor="address_line2" className="block text-sm font-medium text-gray-700 mb-2">
              Address Line 2
            </label>
            <textarea
              id="address_line2"
              value={formData.address_line2}
              onChange={(e) => handleChange('address_line2', e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Area, Locality"
            />
          </div>

          {/* Latitude/Longitude */}
          <div>
            <label htmlFor="lat_long" className="block text-sm font-medium text-gray-700 mb-2">
              Latitude, Longitude
            </label>
            <input
              id="lat_long"
              type="text"
              value={formData.lat_long}
              onChange={(e) => handleChange('lat_long', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., 28.7041, 77.1025"
            />
          </div>

          {/* Google Maps Code */}
          <div>
            <label htmlFor="google_maps_code" className="block text-sm font-medium text-gray-700 mb-2">
              Google Maps Code
            </label>
            <input
              id="google_maps_code"
              type="text"
              value={formData.google_maps_code}
              onChange={(e) => handleChange('google_maps_code', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Google Maps Plus Code"
            />
          </div>

          {/* Landmark */}
          <div>
            <label htmlFor="landmark" className="block text-sm font-medium text-gray-700 mb-2">
              Landmark
            </label>
            <input
              id="landmark"
              type="text"
              value={formData.landmark}
              onChange={(e) => handleChange('landmark', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Nearby landmark"
            />
          </div>

          {/* City & State (Grid) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                City & State
              </label>
              {pincodeLoading && (
                <span className="text-xs text-blue-600 animate-pulse">Updating from pincode...</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input
                id="city"
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="City"
              />
              <input
                id="state"
                type="text"
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="State"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <TagSelector
              selectedTagIds={formData.tags}
              onChange={(tags) => handleChange('tags', tags)}
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Additional notes about the customer"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : mode === 'new' ? 'Create Customer' : 'Update Customer'}
            </button>
          </div>
        </form>
      </div>

      {/* Duplicate Customer Modal */}
      {showDuplicateModal && duplicateCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Customer Already Exists</h3>
            <p className="text-gray-600 mb-4">
              A customer with phone number <strong>{duplicateCustomer.phone}</strong> already exists:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="font-medium text-gray-900">{duplicateCustomer.customer_name}</p>
              <p className="text-sm text-gray-600">{duplicateCustomer.phone}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => router.push(`/customers/edit/${duplicateCustomer.customer_id}`)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                View Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
