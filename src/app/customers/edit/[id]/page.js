'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CustomerForm from '@/components/customers/CustomerForm'

export default function EditCustomerPage() {
  const router = useRouter()
  const params = useParams()
  const customerId = params.id

  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

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
    } catch (err) {
      console.error('Error fetching customer:', err)
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    // Navigate back to customers list after successful save
    router.push('/customers')
  }

  const handleCancel = () => {
    router.back()
  }

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Navbar Skeleton */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-32 h-5 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-20" />
          </div>
        </header>

        {/* Form Skeleton */}
        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 space-y-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i}>
                <div className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="w-full h-10 bg-gray-200 rounded-xl animate-pulse"></div>
              </div>
            ))}
          </div>
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
          <span className="text-sm font-semibold text-gray-800">Edit Customer</span>
          <div className="w-20" />
        </div>
      </header>

      {/* Form */}
      <main className="py-8">
        <CustomerForm
          mode="edit"
          initialData={customer}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </main>
    </div>
  )
}
