'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const session = localStorage.getItem('jp_session')
    if (session) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3c-1.243 0-2 .967-2 2.5V19.5c0 .387-.322.5-.5.5s-.5-.113-.5-.5V11c0-1.657-1.343-3-3-3s-3 1.343-3 3v4" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 21c0-1.657-1.343-3-3-3s-3 1.343-3 3 1.343 3 3 3 3-1.343 3-3z" />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  )
}
