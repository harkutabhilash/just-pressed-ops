'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { getSession } from '@/lib/auth'

// ─── Supabase client ──────────────────────────────────────────────────────
let _sup = null
function sup() {
  if (!_sup) _sup = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  return _sup
}

// ─── IST helpers ──────────────────────────────────────────────────────────
function nowIST() {
  const now = new Date()
  return { epoch: now.getTime(), formatted: formatIST(now) }
}
function formatIST(date) {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000)
  const dd  = String(ist.getUTCDate()).padStart(2, '0')
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][ist.getUTCMonth()]
  const yyyy = ist.getUTCFullYear()
  const hh  = String(ist.getUTCHours()).padStart(2, '0')
  const mm  = String(ist.getUTCMinutes()).padStart(2, '0')
  const ss  = String(ist.getUTCSeconds()).padStart(2, '0')
  return `${dd}-${mon}-${yyyy} ${hh}:${mm}:${ss}`
}

// ─── Toast ────────────────────────────────────────────────────────────────
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [toast, onClose])
  if (!toast) return null
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lg text-sm font-medium transition-all duration-300 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {toast.type === 'success'
          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        }
      </svg>
      {toast.message}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ──────────────────────────────────────────────────────────────────────────
export default function DispatchPage() {
  const router = useRouter()
  const [session,  setSession]  = useState(null)
  const [toast,    setToast]    = useState(null)

  // ── Master data
  const [locations, setLocations] = useState([])
  const [skus,      setSkus]      = useState([])
  const [products,  setProducts]  = useState([])

  // ── Form state
  const [fromLoc,     setFromLoc]     = useState(null)
  const [shippedTo,   setShippedTo]   = useState('')
  const [items,       setItems]       = useState([{ sku: null, qty: '', skuSearch: '', skuDropdownOpen: false }])
  const [remarks,     setRemarks]     = useState('')

  // ── Auth
  useEffect(() => {
    const s = getSession()
    if (!s) { router.push('/login'); return }
    setSession(s)
  }, [router])

  // ── Load masters
  const loadMasters = useCallback(async () => {
    const db = sup()
    const [locRes, skuRes, prodRes] = await Promise.all([
      db.from('locations').select('location_id, location_name, location_code, location_type').eq('is_active', true).order('location_name'),
      db.from('skus').select('sku_id, product_id, sku_code, variant_name, size_value, size_unit').eq('is_active', true).order('product_id, size_value'),
      db.from('products').select('product_id, product_name').eq('is_active', true).order('product_name'),
    ])
    setLocations(locRes.data || [])
    setSkus(skuRes.data || [])
    setProducts(prodRes.data || [])
  }, [])

  useEffect(() => { if (session) loadMasters() }, [session, loadMasters])

  // ── Close SKU dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside() {
      setItems(prev => prev.map(item => 
        item.skuDropdownOpen ? { ...item, skuDropdownOpen: false } : item
      ))
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Item list helpers
  function updateItem(idx, field, value) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }
  function addItem() {
    setItems(prev => [...prev, { sku: null, qty: '', skuSearch: '', skuDropdownOpen: false }])
  }
  function removeItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Reset form
  function resetForm() {
    setFromLoc(null)
    setShippedTo('')
    setItems([{ sku: null, qty: '', skuSearch: '', skuDropdownOpen: false }])
    setRemarks('')
  }

  // ── SUBMIT: Create Dispatch
  async function submitDispatch() {
    if (!fromLoc || !shippedTo.trim()) {
      setToast({ type: 'error', message: 'Please select location and enter shipped to' })
      return
    }

    const valid = items.filter(i => i.sku && i.qty && parseInt(i.qty, 10) > 0)
    if (valid.length === 0) {
      setToast({ type: 'error', message: 'Please add at least one SKU with quantity' })
      return
    }

    const db   = sup()
    const time = nowIST()

    // 1. Insert header
    const { data: hdr, error: hErr } = await db.from('dispatches').insert({
      from_location_id:   fromLoc.location_id,
      shipped_to:         shippedTo.trim(),
      dispatch_date:      new Date().toISOString().split('T')[0],
      dispatched_at_ist:  time.formatted,
      dispatched_at_epoch: time.epoch,
      dispatched_by:      session.user_id,
      remarks:            remarks || null,
    }).select()

    if (hErr || !hdr?.[0]) {
      console.error('Dispatch header error:', JSON.stringify(hErr))
      setToast({ type: 'error', message: 'Failed to create dispatch. Try again.' })
      return
    }

    // 2. Insert items
    const { error: iErr } = await db.from('dispatch_items').insert(
      valid.map(i => ({
        dispatch_id:         hdr[0].dispatch_id,
        sku_id:              i.sku.sku_id,
        quantity_dispatched: parseInt(i.qty, 10),
      }))
    )

    if (iErr) {
      console.error('Dispatch items error:', JSON.stringify(iErr))
      setToast({ type: 'error', message: 'Failed to add items. Try again.' })
      return
    }

    setToast({ type: 'success', message: `Dispatch created: ${fromLoc.location_name} → ${shippedTo}` })
    resetForm()
  }

  if (!session) return null

  const validCount = items.filter(i => i.sku && i.qty && parseInt(i.qty, 10) > 0).length

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700">
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span className="text-sm">Home</span>
          </button>
          <span className="text-sm font-semibold text-gray-800">Dispatch Management</span>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 space-y-4">
          
          {/* From Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">From Location</label>
            <select
              value={fromLoc?.location_id || ''}
              onChange={e => setFromLoc(locations.find(l => l.location_id === e.target.value) || null)}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm font-medium text-gray-700 outline-none cursor-pointer focus:border-emerald-400 transition-colors"
            >
              <option value="" disabled>Choose location...</option>
              {locations.map(l => <option key={l.location_id} value={l.location_id}>{l.location_name}</option>)}
            </select>
          </div>

          {/* Shipped To (free text) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Shipped To</label>
            <input
              type="text"
              value={shippedTo}
              onChange={e => setShippedTo(e.target.value)}
              placeholder="e.g., Delhivery Hub, Customer: Ramesh, Trice Partner..."
              className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-700 outline-none focus:border-emerald-400 transition-colors"
            />
          </div>

          {/* Direction indicator */}
          {fromLoc && shippedTo && (
            <div className="bg-gray-50 rounded-xl px-3 py-2 flex items-center justify-center gap-2">
              <span className="text-xs font-semibold text-gray-600">{fromLoc.location_name}</span>
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
              <span className="text-xs font-semibold text-gray-600">{shippedTo}</span>
            </div>
          )}

          {/* SKU rows */}
          {fromLoc && shippedTo && (
            <>
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2.5">
                    {/* Item header */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Item {idx + 1}</span>
                      {items.length > 1 && (
                        <button onClick={() => removeItem(idx)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* SKU searchable dropdown */}
                    <div className="relative">
                      <input
                        type="text"
                        value={item.skuSearch || ''}
                        onChange={e => {
                          updateItem(idx, 'skuSearch', e.target.value)
                          updateItem(idx, 'skuDropdownOpen', true)
                        }}
                        onFocus={() => updateItem(idx, 'skuDropdownOpen', true)}
                        placeholder="Search SKU..."
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 outline-none focus:border-emerald-400 transition-colors"
                      />
                      {item.sku && (
                        <div className="absolute right-2 top-2 flex items-center gap-1">
                          <span className="text-xs text-gray-400">{item.sku.size_value} {item.sku.size_unit}</span>
                          <button
                            onClick={() => {
                              updateItem(idx, 'sku', null)
                              updateItem(idx, 'skuSearch', '')
                            }}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                      
                      {/* Dropdown results */}
                      {item.skuDropdownOpen && !item.sku && (
                        <div 
                          className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg"
                          onMouseDown={e => e.stopPropagation()}
                        >
                          {(() => {
                            const search = (item.skuSearch || '').toLowerCase()
                            const filtered = skus.filter(s => {
                              const prod = products.find(p => p.product_id === s.product_id)
                              const label = `${prod?.product_name || ''} ${s.variant_name || s.sku_code || ''} ${s.size_value} ${s.size_unit}`.toLowerCase()
                              return label.includes(search)
                            })
                            
                            if (filtered.length === 0) {
                              return <div className="px-3 py-2 text-xs text-gray-400">No SKUs found</div>
                            }
                            
                            return filtered.slice(0, 50).map(s => {
                              const prod = products.find(p => p.product_id === s.product_id)
                              return (
                                <button
                                  key={s.sku_id}
                                  onMouseDown={e => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setItems(prev => prev.map((it, i) => 
                                      i === idx ? {
                                        ...it,
                                        sku: s,
                                        skuSearch: `${prod?.product_name || ''} · ${s.variant_name || s.sku_code}`,
                                        skuDropdownOpen: false
                                      } : it
                                    ))
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-emerald-50 transition-colors border-b border-gray-100 last:border-0"
                                >
                                  <p className="text-xs font-semibold text-gray-800">{prod?.product_name || '—'}</p>
                                  <p className="text-xs text-gray-500">{s.variant_name || s.sku_code} · {s.size_value} {s.size_unit}</p>
                                </button>
                              )
                            })
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="flex gap-2">
                      <input
                        type="number" step="1" min="1"
                        value={item.qty}
                        onChange={e => updateItem(idx, 'qty', e.target.value)}
                        placeholder="Quantity"
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 outline-none focus:border-emerald-400 transition-colors"
                      />
                      <span className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600">units</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add another item */}
              <button
                onClick={addItem}
                className="w-full py-2 rounded-xl border-2 border-dashed border-gray-300 text-xs font-semibold text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-all"
              >
                + Add another SKU
              </button>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Remarks (optional)</label>
                <textarea
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="Any notes about this dispatch..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-700 outline-none focus:border-emerald-400 transition-colors resize-none"
                />
              </div>

              {/* Submit */}
              <button
                onClick={submitDispatch}
                disabled={validCount === 0}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-700 active:scale-95"
              >
                Create Dispatch ({validCount} {validCount === 1 ? 'SKU' : 'SKUs'})
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
