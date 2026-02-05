'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { getSession } from '@/lib/auth'
import { uploadReturnImage, uploadReturnVideo, validateFile } from '@/lib/cloudinary'

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

// ─── Generate return ID ───────────────────────────────────────────────────
function generateReturnId() {
  const now = new Date()
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
  const y  = ist.getUTCFullYear().toString().slice(-2)
  const m  = String(ist.getUTCMonth() + 1).padStart(2, '0')
  const d  = String(ist.getUTCDate()).padStart(2, '0')
  const rn = String(Math.floor(Math.random() * 9000) + 1000)
  return `RET-${y}${m}${d}-${rn}`
}

// ─── Physical conditions ──────────────────────────────────────────────────
const CONDITIONS = ['OK', 'Damaged', 'Leakage', 'Incorrect Product', 'Missing']
const ACTIONS = ['Restock', 'Dispose']

// ─── Toast ────────────────────────────────────────────────────────────────
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 4000)
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
export default function ReturnsPage() {
  const router = useRouter()
  const [session,  setSession]  = useState(null)
  const [toast,    setToast]    = useState(null)

  // ── Master data
  const [locations, setLocations] = useState([])
  const [skus,      setSkus]      = useState([])
  const [products,  setProducts]  = useState([])

  // ── Form state
  const [returnId,    setReturnId]    = useState(generateReturnId())
  const [location,    setLocation]    = useState(null)
  const [orderId,     setOrderId]     = useState('')
  const [awbNumber,   setAwbNumber]   = useState('')
  const [items,       setItems]       = useState([{ sku: null, qty: '', condition: 'OK', action: 'Restock', skuSearch: '', skuDropdownOpen: false }])
  const [remarks,     setRemarks]     = useState('')
  const [photos,      setPhotos]      = useState([])
  const [videos,      setVideos]      = useState([])
  const [uploading,   setUploading]   = useState(false)

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
      db.from('locations').select('location_id, location_name, location_code').eq('is_active', true).order('location_name'),
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
    setItems(prev => [...prev, { sku: null, qty: '', condition: 'OK', action: 'Restock', skuSearch: '', skuDropdownOpen: false }])
  }
  function removeItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Reset form
  function resetForm() {
    setReturnId(generateReturnId())
    setLocation(null)
    setOrderId('')
    setAwbNumber('')
    setItems([{ sku: null, qty: '', condition: 'OK', action: 'Restock', skuSearch: '', skuDropdownOpen: false }])
    setRemarks('')
    setPhotos([])
    setVideos([])
  }

  // ── Photo upload
  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setUploading(true)
    const uploaded = []

    for (const file of files) {
      const validation = validateFile(file, 'image')
      if (!validation.valid) {
        setToast({ type: 'error', message: validation.error })
        continue
      }

      try {
        const { url } = await uploadReturnImage(file, returnId)
        uploaded.push(url)
      } catch (error) {
        setToast({ type: 'error', message: `Failed to upload ${file.name}: ${error.message}` })
      }
    }

    setPhotos(prev => [...prev, ...uploaded])
    setUploading(false)
    if (uploaded.length > 0) {
      setToast({ type: 'success', message: `${uploaded.length} photo(s) uploaded` })
    }
  }

  // ── Video upload
  async function handleVideoUpload(e) {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setUploading(true)
    const uploaded = []

    for (const file of files) {
      const validation = validateFile(file, 'video')
      if (!validation.valid) {
        setToast({ type: 'error', message: validation.error })
        continue
      }

      try {
        const { url } = await uploadReturnVideo(file, returnId)
        uploaded.push(url)
      } catch (error) {
        setToast({ type: 'error', message: `Failed to upload ${file.name}: ${error.message}` })
      }
    }

    setVideos(prev => [...prev, ...uploaded])
    setUploading(false)
    if (uploaded.length > 0) {
      setToast({ type: 'success', message: `${uploaded.length} video(s) uploaded` })
    }
  }

  // ── SUBMIT: Create Return
  async function submitReturn() {
    if (!location) {
      setToast({ type: 'error', message: 'Please select location' })
      return
    }

    const valid = items.filter(i => i.sku && i.qty && parseInt(i.qty, 10) > 0)
    if (valid.length === 0) {
      setToast({ type: 'error', message: 'Please add at least one SKU with quantity' })
      return
    }

    // Check if any item has Dispose action - photos required
    const hasDispose = valid.some(i => i.action === 'Dispose')
    if (hasDispose && photos.length === 0) {
      setToast({ type: 'error', message: 'Photos required when action is Dispose' })
      return
    }

    const db   = sup()
    const time = nowIST()

    // 1. Insert header
    const { data: hdr, error: hErr } = await db.from('returns').insert({
      received_location_id: location.location_id,
      order_id:             orderId.trim() || null,
      awb_number:           awbNumber.trim() || null,
      received_date:        new Date().toISOString().split('T')[0],
      received_at_ist:      time.formatted,
      received_at_epoch:    time.epoch,
      received_by:          session.user_id,
      remarks:              remarks || null,
      photos:               JSON.stringify(photos),
      videos:               JSON.stringify(videos),
    }).select()

    if (hErr || !hdr?.[0]) {
      console.error('Return header error:', JSON.stringify(hErr))
      setToast({ type: 'error', message: 'Failed to create return. Try again.' })
      return
    }

    // 2. Insert items
    const { error: iErr } = await db.from('return_items').insert(
      valid.map(i => ({
        return_id:          hdr[0].return_id,
        sku_id:             i.sku.sku_id,
        quantity_returned:  parseInt(i.qty, 10),
        physical_condition: i.condition,
        action_taken:       i.action,
      }))
    )

    if (iErr) {
      console.error('Return items error:', JSON.stringify(iErr))
      setToast({ type: 'error', message: 'Failed to add items. Try again.' })
      return
    }

    setToast({ type: 'success', message: `Return ${returnId} recorded` })
    resetForm()
  }

  if (!session) return null

  const validCount = items.filter(i => i.sku && i.qty && parseInt(i.qty, 10) > 0).length
  const hasDispose = items.some(i => i.action === 'Dispose')

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
          <span className="text-sm font-semibold text-gray-800">Shipment Returns</span>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 space-y-4">
          
          {/* Return ID display */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
            <span className="text-xs font-semibold text-blue-700">Return ID: {returnId}</span>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Received at Location</label>
            <select
              value={location?.location_id || ''}
              onChange={e => setLocation(locations.find(l => l.location_id === e.target.value) || null)}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm font-medium text-gray-700 outline-none cursor-pointer focus:border-blue-400 transition-colors"
            >
              <option value="" disabled>Choose location...</option>
              {locations.map(l => <option key={l.location_id} value={l.location_id}>{l.location_name}</option>)}
            </select>
          </div>

          {/* Order ID (optional) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Order ID <span className="text-xs text-gray-400">(optional)</span></label>
            <input
              type="text"
              value={orderId}
              onChange={e => setOrderId(e.target.value)}
              placeholder="e.g., ORD-12345"
              className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-700 outline-none focus:border-blue-400 transition-colors"
            />
          </div>

          {/* AWB Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">AWB / Tracking Number</label>
            <input
              type="text"
              value={awbNumber}
              onChange={e => setAwbNumber(e.target.value)}
              placeholder="e.g., DEL123456789"
              className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-700 outline-none focus:border-blue-400 transition-colors"
            />
          </div>

          {/* SKU rows */}
          {location && (
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
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 outline-none focus:border-blue-400 transition-colors"
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
                                  className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
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

                    {/* Quantity + Condition */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity</label>
                        <input
                          type="number" step="1" min="1"
                          value={item.qty}
                          onChange={e => updateItem(idx, 'qty', e.target.value)}
                          placeholder="Qty"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 outline-none focus:border-blue-400 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Condition</label>
                        <select
                          value={item.condition}
                          onChange={e => updateItem(idx, 'condition', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 outline-none cursor-pointer focus:border-blue-400 transition-colors"
                        >
                          {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Action */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Action</label>
                      <select
                        value={item.action}
                        onChange={e => updateItem(idx, 'action', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 outline-none cursor-pointer focus:border-blue-400 transition-colors"
                      >
                        {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add another item */}
              <button
                onClick={addItem}
                className="w-full py-2 rounded-xl border-2 border-dashed border-gray-300 text-xs font-semibold text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-all"
              >
                + Add another SKU
              </button>

              {/* Photos */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Photos {hasDispose && <span className="text-red-600">*</span>} 
                  <span className="text-xs text-gray-400 ml-2">(max 2MB each)</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {photos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {photos.map((url, i) => (
                      <div key={i} className="relative group">
                        <img src={url} alt={`Evidence ${i+1}`} className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                        <button
                          onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Videos */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Videos <span className="text-xs text-gray-400">(optional, max 5MB each)</span>
                </label>
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={handleVideoUpload}
                  disabled={uploading}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {videos.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {videos.map((url, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-xs text-gray-600">Video {i+1}</span>
                        <button
                          onClick={() => setVideos(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Remarks (optional)</label>
                <textarea
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="Any notes about this return..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-700 outline-none focus:border-blue-400 transition-colors resize-none"
                />
              </div>

              {/* Upload status */}
              {uploading && (
                <div className="text-center py-2 text-sm text-blue-600">
                  Uploading...
                </div>
              )}

              {/* Submit */}
              <button
                onClick={submitReturn}
                disabled={validCount === 0 || uploading}
                className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 active:scale-95"
              >
                Record Return ({validCount} {validCount === 1 ? 'SKU' : 'SKUs'})
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
