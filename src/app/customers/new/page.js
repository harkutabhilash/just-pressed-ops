'use client'

import { useRouter } from 'next/navigation'
import CustomerForm from '@/components/customers/CustomerForm'

export default function NewCustomerPage() {
  const router = useRouter()

  const handleSave = () => {
    // Navigate back to customers list after successful save
    router.push('/customers')
  }

  const handleCancel = () => {
    router.back()
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
          <span className="text-sm font-semibold text-gray-800">Add Customer</span>
          <div className="w-20" />
        </div>
      </header>

      {/* Form */}
      <main className="py-8">
        <CustomerForm
          mode="new"
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </main>
    </div>
  )
}
