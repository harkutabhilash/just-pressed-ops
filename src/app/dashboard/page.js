// src/app/dashboard/page.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, logout } from '@/lib/auth';

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const session = getSession();
    
    console.log('Dashboard: session check', session);
    
    if (!session) {
      router.push('/login');
      return;
    }

    console.log('Dashboard: profile data', session.profile);
    setProfile(session.profile);
    setLoading(false);
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const navigateToModule = (moduleKey) => {
    router.push(`/${moduleKey.replace('_', '-')}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  console.log('Dashboard: rendering with profile', profile);
  console.log('Dashboard: profile.modules', profile.modules);

  // Split modules into live vs upcoming
  const liveKeys = ['production_tracking', 'stock_movement', 'dashboard_production']
  const liveModules = profile.modules 
    ? profile.modules.filter(m => liveKeys.includes(m.module_key)).sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    : []
  const upcomingModules = profile.modules
    ? profile.modules.filter(m => !liveKeys.includes(m.module_key)).sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    : []

  console.log('Dashboard: liveModules', liveModules);
  console.log('Dashboard: upcomingModules', upcomingModules);

  // Module icons mapping
  const moduleIcons = {
    materials_incoming: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    production_tracking: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    stock_view: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    stock_movement: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    dispatch: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    returns: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
      </svg>
    ),
    dashboard_production: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    dashboard_dispatch: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Just Pressed</h1>
                <p className="text-sm text-gray-600">Operations</p>
              </div>
            </div>

            {/* User menu */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{profile.full_name}</p>
                <p className="text-xs text-gray-600">{profile.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {profile.full_name.split(' ')[0]}!
          </h2>
          <p className="text-gray-600">
            Choose a module to get started with your tasks.
          </p>
        </div>

        {/* Modules grid */}
        <div className="space-y-8">
          {/* Live modules */}
          <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Active Modules</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveModules.length > 0 ? (
                liveModules.map((module) => (
                  <button
                    key={module.module_key}
                    onClick={() => navigateToModule(module.module_key)}
                    className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-900/10 transition-all duration-200 text-left group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center text-emerald-700 group-hover:from-emerald-600 group-hover:to-emerald-700 group-hover:text-white transition-all">
                        {moduleIcons[module.module_key] || (
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                          </svg>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-emerald-700 transition-colors">
                          {module.module_name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                          {module.can_write && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">Create</span>
                          )}
                          {module.can_edit && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Edit</span>
                          )}
                          {module.can_view && !module.can_write && !module.can_edit && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">View Only</span>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      <svg className="w-6 h-6 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-600">No active modules available yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming modules */}
          {upcomingModules.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Coming Soon</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingModules.map((module) => (
                  <div
                    key={module.module_key}
                    className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200 opacity-60 cursor-not-allowed text-left"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400">
                        {moduleIcons[module.module_key] || (
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                          </svg>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-600 mb-1">
                          {module.module_name}
                        </h3>
                        <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                          Coming Soon
                        </span>
                      </div>

                      {/* Lock icon */}
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
