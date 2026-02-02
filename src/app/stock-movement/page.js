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

// ─── Reason options ───────────────────────────────────────────────────────
const REASONS = ['Fresh Stock', 'Expired', 'Leakage', 'Bad Packing', 'Missing Label', 'Reprocess']

// ─── Friendly code: derive from data ──────────────────────────────────────
// Format: DDMMYY_FromCode_ToCode_SerialNumber
// e.g. 030226_Ramayampet_Attapur_1 (1st transfer of the day from that pair)
function friendlyCode(transfer, locations, serialNumber) {
  const from = locations.find(l => l.location_id === transfer.from_location_id)
  const to   = locations.find(l => l.location_id === transfer.to_location_id)
  
  // Parse date from sent_at_ist (format: "03-Feb-2026 14:30:05")
  const parts = (transfer.sent_at_ist || '').split(/[\s-:]/)
  const dd    = parts[0] || '00'
  const mm    = parts[1] ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(parts[1]) + 1 : 0
  const yy    = parts[2] ? parts[2].slice(-2) : '00'
  
  return `${dd}${String(mm).padStart(2,'0')}${yy}_${from?.location_code || 'From'}_${to?.location_code || 'To'}_${serialNumber}`
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
export default function StockMovementPage() {
  const router = useRouter()
  const [session,    setSession]    = useState(null)
  const [toast,      setToast]      = useState(null)
  const [activeFlow, setActiveFlow] = useState(null) // 'send' | 'verify'

  // ── Masters
  const [locations, setLocations] = useState([])
  const [skus,      setSkus]      = useState([])
  const [products,  setProducts]  = useState([])

  // ── Send state
  const [fromLoc,    setFromLoc]    = useState(null)
  const [toLoc,      setToLoc]      = useState(null)
  const [items,      setItems]      = useState([{ sku: null, qty: '', reason: 'Fresh Stock', skuSearch: '', skuDropdownOpen: false }])
  const [sendNotes,  setSendNotes]  = useState('')

  // ── Verify state
  const [pendingList,       setPendingList]       = useState([])
  const [selectedTransfer,  setSelectedTransfer]  = useState(null)
  const [verifyItems,       setVerifyItems]       = useState([])
  const [verifyRemarks,     setVerifyRemarks]     = useState('')

  // ── Auth
  useEffect(() => {
    const s = getSession()
    if (!s) { router.push('/login'); return }
    setSession(s)
  }, [router])

  // ── Load masters once
  const loadMasters = useCallback(async () => {
    const db = sup()
    const [locR, skuR, prodR] = await Promise.all([
      db.from('locations').select('location_id, location_name, location_code, location_type').eq('is_active', true).order('location_name'),
      db.from('skus').select('sku_id, product_id, sku_code, variant_name, size_value, size_unit').eq('is_active', true).order('product_id, size_value'),
      db.from('products').select('product_id, product_name').eq('is_active', true).order('product_name'),
    ])
    setLocations(locR.data || [])
    setSkus(skuR.data || [])
    setProducts(prodR.data || [])
  }, [])

  useEffect(() => { if (session) loadMasters() }, [session, loadMasters])

  // ── Close SKU dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      // Close any open SKU dropdowns if clicking outside
      setItems(prev => prev.map(item => 
        item.skuDropdownOpen ? { ...item, skuDropdownOpen: false } : item
      ))
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Lazy: pending transfers (fetched only when verify panel opens)
  async function fetchPending() {
    const db = sup()
    const { data } = await db.from('stock_movements')
      .select('*')
      .eq('status', 'pending')
      .eq('is_deleted', false)
      .order('sent_at_epoch', { ascending: false })
    setPendingList(data || [])
    setSelectedTransfer(null)
    setVerifyItems([])
    setVerifyRemarks('')
  }

  // ── When user taps a pending transfer, load its items
  async function selectTransfer(t) {
    setSelectedTransfer(t)
    setVerifyRemarks('')
    const db = sup()
    const { data } = await db.from('stock_movement_items')
      .select('item_id, sku_id, qty_sent, reason, qty_received')
      .eq('movement_id', t.movement_id)
      .eq('is_deleted', false)
      .order('item_id')
    // Pre-fill qty_received = qty_sent so verifier only touches mismatches
    setVerifyItems((data || []).map(row => ({
      ...row,
      qty_received: row.qty_received != null ? row.qty_received : row.qty_sent
    })))
  }

  // ── Reset send form
  function resetSend() {
    setFromLoc(null); setToLoc(null)
    setItems([{ sku: null, qty: '', reason: 'Fresh Stock', skuSearch: '', skuDropdownOpen: false }])
    setSendNotes('')
  }

  // ── Reset on flow switch
  useEffect(() => {
    resetSend()
    setSelectedTransfer(null)
    setVerifyItems([])
    setVerifyRemarks('')
  }, [activeFlow])

  // ── Item list helpers
  function updateItem(idx, field, value) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }
  function addItem()       { setItems(prev => [...prev, { sku: null, qty: '', reason: 'Fresh Stock', skuSearch: '', skuDropdownOpen: false }]) }
  function removeItem(idx) { setItems(prev => prev.filter((_, i) => i !== idx)) }

  // ── SUBMIT: Send
  async function submitSend() {
    if (!fromLoc || !toLoc) return
    const valid = items.filter(i => i.sku && i.qty && parseInt(i.qty, 10) > 0)
    if (valid.length === 0) return

    const db   = sup()
    const time = nowIST()

    // 1. header
    const { data: hdr, error: hErr } = await db.from('stock_movements').insert({
      from_location_id: fromLoc.location_id,
      to_location_id:   toLoc.location_id,
      status:           'pending',
      sent_by:          session.user_id,
      sent_at_ist:      time.formatted,
      sent_at_epoch:    time.epoch,
      notes:            sendNotes || null,
    }).select()

    if (hErr || !hdr?.[0]) {
      console.error('Send header err:', JSON.stringify(hErr))
      setToast({ type: 'error', message: 'Failed to create transfer. Try again.' })
      return
    }

    // 2. items
    const { error: iErr } = await db.from('stock_movement_items').insert(
      valid.map(i => ({
        movement_id: hdr[0].movement_id,
        sku_id:      i.sku.sku_id,
        qty_sent:    parseInt(i.qty, 10),
        reason:      i.reason,
      }))
    )
    if (iErr) {
      console.error('Send items err:', JSON.stringify(iErr))
      setToast({ type: 'error', message: 'Failed to add items. Try again.' })
      return
    }

    setToast({ type: 'success', message: `Transfer sent: ${fromLoc.location_name} → ${toLoc.location_name}` })
    setActiveFlow(null)
    resetSend()
  }

  // ── SUBMIT: Verify
  async function submitVerify() {
    if (!selectedTransfer) return
    const db   = sup()
    const time = nowIST()

    // 1. write qty_received on every item
    for (const item of verifyItems) {
      await db.from('stock_movement_items')
        .update({ qty_received: parseInt(item.qty_received, 10) })
        .eq('item_id', item.item_id)
    }

    // 2. mark header verified
    const { error } = await db.from('stock_movements').update({
      status:            'verified',
      verified_by:       session.user_id,
      verified_at_ist:   time.formatted,
      verified_at_epoch: time.epoch,
      verify_remarks:    verifyRemarks || null,
    }).eq('movement_id', selectedTransfer.movement_id)

    if (error) {
      setToast({ type: 'error', message: 'Failed to verify. Try again.' })
      return
    }

    setToast({ type: 'success', message: `Transfer verified: ${locations.find(l => l.location_id === selectedTransfer.from_location_id)?.location_name} → ${locations.find(l => l.location_id === selectedTransfer.to_location_id)?.location_name}` })
    setSelectedTransfer(null)
    setVerifyItems([])
    setVerifyRemarks('')
    fetchPending()
  }

  if (!session) return null

  // ── Derived
  const toOptions    = locations.filter(l => l.location_id !== fromLoc?.location_id)
  const validCount   = items.filter(i => i.sku && i.qty && parseInt(i.qty, 10) > 0).length
  const pendingCount = pendingList.length

  // ── Accordion definitions
  const actions = [
    { key: 'send',   label: 'Send Stock',        icon: 'M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6.84 3.08 2.173 3.857A9.102 9.102 0 0012 21.75a9.1 9.1 0 008.577-5.393c1.333-.779 2.173-2.257 2.173-3.857 0-2.439-2.239-4.38-5-4.38-.391 0-.768.044-1.123.115A5.25 5.25 0 005.25 9.75c0 .28.018.554.05.82C3.372 10.756 2.25 12.144 2.25 13.813c0 1.6.884 3.08 2.25 3.857', color: 'emerald', count: null, countLabel: null },
    { key: 'verify', label: 'Verify Transfers',  icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z', color: 'blue', count: pendingCount, countLabel: 'pending' },
  ]

  const colorMap = {
    emerald: { icon: 'bg-emerald-100 text-emerald-600', active: 'border-emerald-500 bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700' },
    blue:    { icon: 'bg-blue-100 text-blue-600',       active: 'border-blue-500 bg-blue-50',       badge: 'bg-blue-100 text-blue-700' },
  }

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
          <span className="text-sm font-semibold text-gray-800">Stock Movement</span>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        <div className="space-y-2">
          {actions.map(a => {
            const c        = colorMap[a.color]
            const isActive = activeFlow === a.key
            return (
              <div key={a.key} className={`rounded-2xl border-2 overflow-hidden transition-all duration-200 ${isActive ? c.active : 'border-gray-200 bg-white'}`}>

                {/* Accordion header */}
                <button
                  onClick={() => {
                    const next = isActive ? null : a.key
                    setActiveFlow(next)
                    if (next === 'verify') fetchPending()
                  }}
                  className="w-full flex items-center justify-between px-4 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 ${c.icon} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={a.icon} />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{a.label}</span>
                    {a.count > 0 && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.badge}`}>{a.count} {a.countLabel}</span>
                    )}
                  </div>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {/* Accordion body */}
                {isActive && (
                  <div className="px-4 pb-4 pt-1 space-y-4 border-t border-gray-100">

                    {/* ═══════════════════════════════════════════════════
                        SEND
                    ═══════════════════════════════════════════════════ */}
                    {a.key === 'send' && (
                      <>
                        {/* From */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">From Location</label>
                          <select
                            value={fromLoc?.location_id || ''}
                            onChange={e => {
                              const loc = locations.find(l => l.location_id === e.target.value)
                              setFromLoc(loc || null)
                              if (toLoc?.location_id === loc?.location_id) setToLoc(null)
                            }}
                            className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm font-medium text-gray-700 outline-none cursor-pointer focus:border-emerald-400 transition-colors"
                          >
                            <option value="" disabled>Choose location...</option>
                            {locations.map(l => <option key={l.location_id} value={l.location_id}>{l.location_name}</option>)}
                          </select>
                        </div>

                        {/* To — From is excluded */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">To Location</label>
                          <select
                            value={toLoc?.location_id || ''}
                            onChange={e => setToLoc(locations.find(l => l.location_id === e.target.value) || null)}
                            disabled={!fromLoc}
                            className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm font-medium text-gray-700 outline-none cursor-pointer focus:border-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <option value="" disabled>Choose location...</option>
                            {toOptions.map(l => <option key={l.location_id} value={l.location_id}>{l.location_name}</option>)}
                          </select>
                        </div>

                        {/* Direction pill — only once both are picked */}
                        {fromLoc && toLoc && (
                          <div className="bg-gray-50 rounded-xl px-3 py-2 flex items-center justify-center gap-2">
                            <span className="text-xs font-semibold text-gray-600">{fromLoc.location_name}</span>
                            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                            <span className="text-xs font-semibold text-gray-600">{toLoc.location_name}</span>
                          </div>
                        )}

                        {/* SKU rows — only shown once both locations are set */}
                        {fromLoc && toLoc && (
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

                                  {/* SKU — searchable dropdown */}
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={item.skuSearch || ''}
                                      onChange={e => {
                                        const search = e.target.value
                                        updateItem(idx, 'skuSearch', search)
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
                                      <div className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
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
                                                onClick={() => {
                                                  updateItem(idx, 'sku', s)
                                                  updateItem(idx, 'skuSearch', `${prod?.product_name || ''} · ${s.variant_name || s.sku_code}`)
                                                  updateItem(idx, 'skuDropdownOpen', false)
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

                                  {/* Qty + Reason in one row */}
                                  <div className="flex gap-2">
                                    <input
                                      type="number" step="1" min="1"
                                      value={item.qty}
                                      onChange={e => updateItem(idx, 'qty', e.target.value)}
                                      placeholder="Qty"
                                      className="w-24 flex-shrink-0 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 outline-none focus:border-emerald-400 transition-colors"
                                    />
                                    <select
                                      value={item.reason}
                                      onChange={e => updateItem(idx, 'reason', e.target.value)}
                                      className="flex-1 px-2 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 outline-none cursor-pointer focus:border-emerald-400 transition-colors"
                                    >
                                      {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* + Add another */}
                            <button
                              onClick={addItem}
                              className="w-full py-2 rounded-xl border-2 border-dashed border-gray-300 text-xs font-semibold text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-all"
                            >
                              + Add another SKU
                            </button>

                            {/* Notes */}
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notes (optional)</label>
                              <input
                                type="text"
                                value={sendNotes}
                                onChange={e => setSendNotes(e.target.value)}
                                placeholder="Any remarks for this transfer..."
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-700 outline-none focus:border-emerald-400 transition-colors"
                              />
                            </div>

                            {/* Submit */}
                            <button
                              onClick={submitSend}
                              disabled={validCount === 0}
                              className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-700 active:scale-95"
                            >
                              Send Transfer ({validCount} {validCount === 1 ? 'SKU' : 'SKUs'})
                            </button>
                          </>
                        )}
                      </>
                    )}

                    {/* ═══════════════════════════════════════════════════
                        VERIFY
                    ═══════════════════════════════════════════════════ */}
                    {a.key === 'verify' && (
                      <>
                        {pendingList.length === 0 ? (
                          <div className="text-center py-6">
                            <p className="text-gray-400 text-sm">No pending transfers to verify</p>
                          </div>

                        ) : !selectedTransfer ? (
                          /* ── pending list ── */
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">Select Transfer</label>
                            {pendingList.map((t, idx) => {
                              const from = locations.find(l => l.location_id === t.from_location_id)
                              const to   = locations.find(l => l.location_id === t.to_location_id)
                              const code = friendlyCode(t, locations, pendingList.length - idx)
                              return (
                                <button
                                  key={t.movement_id}
                                  onClick={() => selectTransfer(t)}
                                  className="w-full text-left rounded-xl border-2 border-gray-200 bg-white hover:border-blue-400 p-3 transition-all"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-gray-800">{code}</span>
                                    <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">Pending</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1.5">
                                    <span className="text-xs text-gray-500">{from?.location_name || '—'}</span>
                                    <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                    </svg>
                                    <span className="text-xs text-gray-500">{to?.location_name || '—'}</span>
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1">{t.sent_at_ist}</p>
                                  {t.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{t.notes}</p>}
                                </button>
                              )
                            })}
                          </div>

                        ) : (
                          /* ── verify detail ── */
                          <>
                            {/* Header card */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-blue-800">
                                  {friendlyCode(selectedTransfer, locations, pendingList.findIndex(t => t.movement_id === selectedTransfer.movement_id) + 1)}
                                </span>
                                <button
                                  onClick={() => { setSelectedTransfer(null); setVerifyItems([]) }}
                                  className="text-blue-400 hover:text-blue-600"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <span className="text-xs text-blue-600">{locations.find(l => l.location_id === selectedTransfer.from_location_id)?.location_name || '—'}</span>
                                <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                </svg>
                                <span className="text-xs text-blue-600">{locations.find(l => l.location_id === selectedTransfer.to_location_id)?.location_name || '—'}</span>
                              </div>
                              <p className="text-xs text-blue-500 mt-1">Sent: {selectedTransfer.sent_at_ist}</p>
                              {selectedTransfer.notes && <p className="text-xs text-blue-500 mt-0.5 italic">{selectedTransfer.notes}</p>}
                            </div>

                            {/* Column headers */}
                            <div className="grid grid-cols-12 gap-1 px-1">
                              <span className="col-span-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">SKU</span>
                              <span className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Why</span>
                              <span className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Sent</span>
                              <span className="col-span-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Got</span>
                            </div>

                            {/* Item rows */}
                            <div className="space-y-1.5">
                              {verifyItems.map((item, idx) => {
                                const sku  = skus.find(s => s.sku_id === item.sku_id)
                                const prod = sku ? products.find(p => p.product_id === sku.product_id) : null
                                const mismatch = item.qty_received != null && parseInt(item.qty_received, 10) !== item.qty_sent
                                return (
                                  <div
                                    key={item.item_id}
                                    className={`grid grid-cols-12 gap-1 items-center rounded-lg px-2 py-2 ${mismatch ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}
                                  >
                                    {/* SKU name */}
                                    <div className="col-span-5 min-w-0">
                                      <p className="text-xs font-semibold text-gray-800 truncate">{prod?.product_name || '—'}</p>
                                      <p className="text-xs text-gray-500 truncate">{sku?.variant_name || sku?.sku_code || '—'}</p>
                                    </div>
                                    {/* Reason badge */}
                                    <div className="col-span-2 flex justify-center">
                                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded whitespace-nowrap ${
                                        item.reason === 'Fresh Stock'   ? 'bg-emerald-100 text-emerald-700' :
                                        item.reason === 'Expired'       ? 'bg-red-100 text-red-700'         :
                                                                          'bg-amber-100 text-amber-700'
                                      }`}>
                                        {item.reason === 'Missing Label' ? 'No Label' : item.reason === 'Bad Packing' ? 'Bad Pack' : item.reason === 'Fresh Stock' ? 'Fresh' : item.reason}
                                      </span>
                                    </div>
                                    {/* Sent qty */}
                                    <div className="col-span-2 text-center">
                                      <span className="text-xs font-bold text-gray-700">{item.qty_sent}</span>
                                    </div>
                                    {/* Received qty — editable */}
                                    <div className="col-span-3">
                                      <input
                                        type="number" step="1" min="0"
                                        value={item.qty_received != null ? item.qty_received : ''}
                                        onChange={e => {
                                          const v = e.target.value
                                          setVerifyItems(prev => prev.map((vi, i) => i === idx ? { ...vi, qty_received: v === '' ? null : v } : vi))
                                        }}
                                        className="w-full px-2 py-1 rounded-lg border border-gray-200 text-xs font-semibold text-center text-gray-700 outline-none focus:border-emerald-400"
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>

                            {/* Remarks */}
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Remarks (optional)</label>
                              <input
                                type="text"
                                value={verifyRemarks}
                                onChange={e => setVerifyRemarks(e.target.value)}
                                placeholder="Any variance notes..."
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-700 outline-none focus:border-emerald-400 transition-colors"
                              />
                            </div>

                            {/* Verify button */}
                            <button
                              onClick={submitVerify}
                              className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold transition-all duration-150 hover:bg-blue-700 active:scale-95"
                            >
                              Verify Transfer
                            </button>
                          </>
                        )}
                      </>
                    )}

                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
