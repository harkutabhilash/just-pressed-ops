'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, logout } from '@/lib/auth'

function ModuleIcon({ moduleKey }) {
  const icons = {
    materials_incoming: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    ),
    production_tracking: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    ),
    packing: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v4.125c0 2.278-3.694 4.125-8.25 4.125S3.75 12.778 3.75 10.5V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 21.652 16.556 23.625 12 23.625s-8.25-1.973-8.25-4.375v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    ),
    stock_view: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v.75m0 0h7.5A2.25 2.25 0 0120.25 9v.75m0 0v8.25A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-.75m0 0h-4.5A2.25 2.25 0 016 15.75V9A2.25 2.25 0 018.25 6.75H10.5" />
    ),
    stock_movement: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    ),
    dispatch: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    ),
    returns: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9 4.5l-4.5 4.5m0 0L9 13.5M4.5 9H19.5a6 6 0 010 12h-1.5" />
    ),
    orders: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    ),
    invoicing: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M11.25 11.25l4.74 4.74m0 0l-4.74 4.74m4.74-4.74H9M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    dashboard_production: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
    ),
    dashboard_dispatch: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M3.75 3.75v4.5M3.75 3.75H8.25M3.75 3.75L9 9M3.75 20.25v-4.5M3.75 20.25H8.25M3.75 20.25L9 15M20.25 3.75v4.5M20.25 3.75H15.75M20.25 3.75L15 9M20.25 20.25v-4.5M20.25 20.25H15.75M20.25 20.25L15 15" />
    ),
    reconciliation: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9 14.25l2.25 2.25 3.75-5.25m6.75 2.25a6.75 6.75 0 11-13.5 0 6.75 6.75 0 0113.5 0z" />
    ),
    analytics_sales: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25C13.746 7.5 14.25 8.004 14.25 8.625v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 0116.5 19.875V4.125z" />
    ),
    user_management: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    ),
    master_data: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    ),
    customers: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    ),
    marketing: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M10.34 21.49A3 3 0 0012 22.5h1.372c.51 0 .999.195 1.358.557l.417.416c.87.87 2.28.87 3.15 0l.834-.833c.39-.39.921-.61 1.474-.61H21m-9 0V9m0 12.49A3 3 0 019.66 21l-1.372-1.372a1.875 1.875 0 00-1.327-.551H3m6 0v-3m0 3H9m3-3V9m0 0H9m3 0h.01M3 21h9" />
    ),
  }

  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {icons[moduleKey] || (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v.75m0 0h7.5A2.25 2.25 0 0120.25 9v.75m0 0v8.25A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-.75m0 0h-4.5A2.25 2.25 0 016 15.75V9A2.25 2.25 0 018.25 6.75H10.5" />
      )}
    </svg>
  )
}

const cardColors = [
  { border: 'border-emerald-200', icon: 'bg-emerald-100 text-emerald-700', hover: 'hover:border-emerald-400' },
  { border: 'border-amber-200', icon: 'bg-amber-100 text-amber-700', hover: 'hover:border-amber-400' },
  { border: 'border-blue-200', icon: 'bg-blue-100 text-blue-700', hover: 'hover:border-blue-400' },
  { border: 'border-purple-200', icon: 'bg-purple-100 text-purple-700', hover: 'hover:border-purple-400' },
  { border: 'border-rose-200', icon: 'bg-rose-100 text-rose-700', hover: 'hover:border-rose-400' },
  { border: 'border-teal-200', icon: 'bg-teal-100 text-teal-700', hover: 'hover:border-teal-400' },
]

// Skeleton card — same size as real card so layout doesn't shift when data arrives
function SkeletonCard() {
  return (
    <div className="rounded-2xl border-2 border-gray-100 bg-white p-4 sm:p-5 animate-pulse">
      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-xl" />
      <div className="mt-3 h-3 bg-gray-200 rounded-full w-3/4" />
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [modules, setModules] = useState([])
  const [modulesLoading, setModulesLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)

   useEffect(() => {
    console.log('🔍 Cloudinary Config:', {
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      preset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
    })
  }, [])

  useEffect(() => {
    async function init() {
      const s = getSession()
      if (!s) {
        router.push('/login')
        return
      }
      setSession(s)
      setAuthChecked(true)

      // Fetch modules in background — greeting already visible
      const { fetchUserModules } = await import('@/lib/auth')
      const mods = await fetchUserModules(s.user_id)
      setModules(mods)
      setModulesLoading(false)
    }
    init()
  }, [router])

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  // Auth not checked yet — blank to avoid flash
  if (!authChecked) return null

  // Live module keys (have pages built)
  const liveKeys = ['production_tracking', 'stock_movement', 'dashboard_production','dispatch']
  const liveModules = modules.filter(m => liveKeys.includes(m.module_key))
  const upcomingModules = modules.filter(m => !liveKeys.includes(m.module_key))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
              <img src="/JP Logo_New_2.png" alt="" className="w-8 h-8" />
            </div>
            <span className="font-semibold text-gray-900 text-sm">Just Pressed</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 hidden sm:inline">{session?.full_name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-gray-500 hover:text-red-600 transition-colors text-sm font-medium px-2 py-1.5 rounded-lg hover:bg-red-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Greeting — renders immediately, no wait */}
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Good morning, {session?.full_name?.split(' ')[0]} 👋
        </h1>

        {/* Module grid with grouping */}
        <div className="space-y-8">
          {/* Active Modules */}
          {(liveModules.length > 0 || modulesLoading) && (
            <div>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Active Modules</h2>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {modulesLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
                ) : (
                  liveModules.map((mod, index) => {
                    const color = cardColors[index % cardColors.length]
                    return (
                      <button
                        key={mod.module_key}
                        onClick={() => router.push(`/${mod.module_key.replace(/_/g, '-')}`)}
                        className={`group text-left rounded-2xl border-2 ${color.border} ${color.hover} bg-white p-4 sm:p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
                      >
                        <div className="flex items-center justify-between">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 ${color.icon} rounded-xl flex items-center justify-center`}>
                            <ModuleIcon moduleKey={mod.module_key} />
                          </div>
                          <svg className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </div>
                        <h3 className="mt-3 text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors leading-tight">
                          {mod.module_name}
                        </h3>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* Coming Soon Modules */}
          {upcomingModules.length > 0 && !modulesLoading && (
            <div>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Coming Soon</h2>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {upcomingModules.map((mod, index) => {
                  const color = cardColors[index % cardColors.length]
                  return (
                    <div
                      key={mod.module_key}
                      className="text-left rounded-2xl border-2 border-gray-200 bg-gray-50 p-4 sm:p-5 opacity-60 cursor-not-allowed"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400">
                          <ModuleIcon moduleKey={mod.module_key} />
                        </div>
                        <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </div>
                      <h3 className="mt-3 text-xs sm:text-sm font-semibold text-gray-600 leading-tight">
                        {mod.module_name}
                      </h3>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!modulesLoading && modules.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <p className="text-gray-600 font-medium">No modules assigned</p>
              <p className="text-gray-400 text-sm mt-1">Contact your admin to get access</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
