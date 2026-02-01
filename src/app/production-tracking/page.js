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
  return {
    epoch: now.getTime(),
    formatted: formatIST(now)
  }
}

function formatIST(date) {
  // Convert to IST (UTC+5:30)
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000)
  const dd = String(ist.getUTCDate()).padStart(2, '0')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const mmm = months[ist.getUTCMonth()]
  const yyyy = ist.getUTCFullYear()
  const hh = String(ist.getUTCHours()).padStart(2, '0')
  const mm = String(ist.getUTCMinutes()).padStart(2, '0')
  const ss = String(ist.getUTCSeconds()).padStart(2, '0')
  return `${dd}-${mmm}-${yyyy} ${hh}:${mm}:${ss}`
}

// ─── Toast component ─────────────────────────────────────────────────────
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

// ─── Seed / Oil image card selector ──────────────────────────────────────
function SeedSelector({ items, selected, onSelect, label }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className={`relative rounded-xl border-2 p-2 pb-2.5 text-center transition-all duration-150 ${
              selected?.id === item.id
                ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            {selected?.id === item.id && (
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <div className="w-full aspect-square rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden mb-1.5">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
              )}
            </div>
            <span className="text-xs font-medium text-gray-700 leading-tight">{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Machine dropdown selector ───────────────────────────────────────────
function MachineSelector({ machines, selected, onSelect }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">Select Machine</label>
      <select
        value={selected?.machine_id || ''}
        onChange={e => {
          const m = machines.find(m => m.machine_id === e.target.value)
          if (m) onSelect(m)
        }}
        className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm font-medium text-gray-700 outline-none cursor-pointer focus:border-emerald-400 transition-colors"
      >
        <option value="" disabled>Choose a machine...</option>
        {machines.map(m => (
          <option key={m.machine_id} value={m.machine_id}>
            {m.machine_code} — {m.machine_name}
          </option>
        ))}
      </select>
    </div>
  )
}

// ─── Qty input with unit toggle ───────────────────────────────────────────
function QtyInput({ value, onChange, unit, onUnitChange, label, error }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="number"
            step="0.01"
            min="0"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="0.00"
            className={`w-full px-3 py-2.5 rounded-xl border-2 text-sm font-medium outline-none transition-colors ${
              error ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-emerald-400'
            }`}
          />
        </div>
        <select
          value={unit}
          onChange={e => onUnitChange(e.target.value)}
          className="px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 outline-none cursor-pointer"
        >
          <option value="kg">kg</option>
          <option value="g">g</option>
          <option value="lb">lb</option>
        </select>
      </div>
      {error && <p className="text-xs text-red-500 mt-1.5 font-medium">{error}</p>}
    </div>
  )
}

// ─── Output row (for stop extraction) ────────────────────────────────────
function OutputRow({ label, value, onChange, error }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0.00"
        className={`w-full px-3 py-2.5 rounded-xl border-2 text-sm font-medium outline-none transition-colors ${
          error ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-emerald-400'
        }`}
      />
    </div>
  )
}

// ─── Running batch card (for stop screens) ───────────────────────────────
function RunningCard({ item, selected, onSelect, type }) {
  // type = 'extraction' | 'filtering'
  const isExtraction = type === 'extraction'
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`w-full text-left rounded-xl border-2 p-3 transition-all duration-150 ${
        selected?.id === item.id
          ? 'border-emerald-500 bg-emerald-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isExtraction ? 'bg-amber-100' : 'bg-blue-100'}`}>
            <svg className={`w-4 h-4 ${isExtraction ? 'text-amber-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isExtraction
                ? 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z'
                : 'M12 3c-1.933 0-3.78.149-5.357.404m5.357-.404c1.933 0 3.78.149 5.357.404m-10.714 0A2.251 2.251 0 004.286 5.25v13.5A2.25 2.25 0 006.536 21h10.928a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25m-10.714 0A2.25 2.25 0 016.536 3.75h10.928'
              } />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {isExtraction ? item.machine_code : item.seed_name}
            </p>
            <p className="text-xs text-gray-500">
              {isExtraction ? item.seed_name : `${item.input_qty_kg} kg`} · {item.input_qty} {isExtraction ? item.unit || 'kg' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">Running</span>
          {selected?.id === item.id && (
            <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-1.5 ml-10.5">Started: {item.start_time_ist || '—'}</p>
    </button>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────
export default function ProductionTrackingPage() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [activeFlow, setActiveFlow] = useState(null) // 'start_extraction' | 'stop_extraction' | 'start_filtering' | 'stop_filtering'
  const [toast, setToast] = useState(null)

  // Master data
  const [seeds, setSeeds] = useState([])
  const [pressMachines, setPressMachines] = useState([])

  // Running batches (for stop screens)
  const [runningBatches, setRunningBatches] = useState([])
  const [runningFilters, setRunningFilters] = useState([])

  // ── Start Extraction state
  const [seState, setSeState] = useState({ machine: null, seed: null, qty: '', unit: 'kg' })

  // ── Stop Extraction state
  const [soState, setSoState] = useState({ batch: null, oil: '', cake: '', error: null })

  // ── Start Filtering state
  const [sfState, setSfState] = useState({ seed: null, qty: '' })

  // ── Stop Filtering state
  const [sfStopState, setSfStopState] = useState({ entry: null, filteredOil: '', error: null })

  // ── Auth check
  useEffect(() => {
    const s = getSession()
    if (!s) { router.push('/login'); return }
    setSession(s)
  }, [router])

  // ── Load master data
  const loadData = useCallback(async () => {
    const db = sup()

    // Seeds
    const { data: seedData } = await db.from('raw_materials').select('*').eq('active', true).order('name')
    setSeeds(seedData || [])

    // Press machines (Wooden Ghani + Expeller)
    const { data: machineData } = await db.from('machines').select('*').eq('status', 'active').neq('machine_type', 'Filter').order('machine_code')
    setPressMachines(machineData || [])

    // Running extraction batches
    const { data: batches } = await db
      .from('production_batches')
      .select('batch_id, machine_id, raw_material_id, seed_type, seed_input_kg, unit, start_time_ist, batch_status')
      .eq('batch_status', 'in_progress')
      .eq('is_deleted', false)
      .order('start_epoch', { ascending: false })

    // Enrich with machine code + remap column names
    const enrichedBatches = (batches || []).map(b => {
      const m = (machineData || []).find(m => m.machine_id === b.machine_id)
      return {
        ...b,
        id: b.batch_id,
        seed_name: b.seed_type,
        input_qty: b.seed_input_kg,
        machine_code: m?.machine_code || '—'
      }
    })
    setRunningBatches(enrichedBatches)

    // Running filtering entries
    const { data: filters } = await db
      .from('filtering_entries')
      .select('id, raw_material_id, input_qty_kg, start_time_ist')
      .is('stop_time_ist', null)
      .eq('is_deleted', false)
      .order('start_epoch', { ascending: false })

    // Enrich with seed name
    const enrichedFilters = (filters || []).map(f => {
      const s = (seedData || []).find(s => s.id === f.raw_material_id)
      return { ...f, seed_name: s?.name || '—' }
    })
    setRunningFilters(enrichedFilters)
  }, [])

  useEffect(() => {
    if (session) loadData()
  }, [session, loadData])

  // ── Reset form when switching flows
  useEffect(() => {
    setSeState({ machine: null, seed: null, qty: '', unit: 'kg' })
    setSoState({ batch: null, oil: '', cake: '', error: null })
    setSfState({ seed: null, qty: '' })
    setSfStopState({ entry: null, filteredOil: '', error: null })
  }, [activeFlow])

  // ── Generate batch_id
  function generateBatchId() {
    const now = new Date()
    const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
    const y = ist.getUTCFullYear().toString().slice(-2)
    const m = String(ist.getUTCMonth() + 1).padStart(2, '0')
    const d = String(ist.getUTCDate()).padStart(2, '0')
    const rand = String(Math.floor(Math.random() * 9000) + 1000)
    return `BP-${y}${m}${d}-${rand}`
  }

  // ── SUBMIT: Start Extraction
  async function submitStartExtraction() {
    if (!seState.machine || !seState.seed || !seState.qty) return
    const db = sup()
    const time = nowIST()
    const batchId = generateBatchId()

    const { error } = await db.from('production_batches').insert({
      batch_id: batchId,
      production_date: new Date().toISOString().split('T')[0],
      machine_id: seState.machine.machine_id,
      operator_id: session.user_id,
      raw_material_id: seState.seed.id,
      seed_type: seState.seed.name,
      seed_input_kg: parseFloat(seState.qty),
      unit: seState.unit,
      batch_status: 'in_progress',
      start_time_ist: time.formatted,
      start_epoch: time.epoch,
      location_id: seState.machine.location_id,
      created_by: session.user_id
    })

    if (error) {
      console.error('Start extraction error:', JSON.stringify(error))
      setToast({ type: 'error', message: error.message || 'Failed to start extraction. Please try again.' })
      return
    }
    setToast({ type: 'success', message: `Extraction started on ${seState.machine.machine_code}` })
    setActiveFlow(null)
    loadData()
  }

  // ── SUBMIT: Stop Extraction
  async function submitStopExtraction() {
    const batch = soState.batch
    const oil = parseFloat(soState.oil) || 0
    const cake = parseFloat(soState.cake) || 0
    const inputKg = parseFloat(batch.input_qty) || 0

    if (oil + cake > inputKg) {
      setSoState(prev => ({ ...prev, error: `Output exceeds input. Input was ${inputKg} ${batch.unit || 'kg'}, but Oil (${oil}) + Cake (${cake}) = ${(oil + cake).toFixed(2)} ${batch.unit || 'kg'}` }))
      return
    }

    const db = sup()
    const time = nowIST()

    const { error } = await db.from('production_batches')
      .update({
        oil_output_kg: oil,
        cake_output_kg: cake,
        batch_status: 'completed',
        end_time_ist: time.formatted,
        end_epoch: time.epoch,
        updated_by: session.user_id,
        updated_at: new Date().toISOString()
      })
      .eq('batch_id', batch.batch_id)

    if (error) {
      setToast({ type: 'error', message: 'Failed to stop extraction.' })
      return
    }
    setToast({ type: 'success', message: `Extraction stopped on ${batch.machine_code}` })
    setActiveFlow(null)
    loadData()
  }

  // ── SUBMIT: Start Filtering
  async function submitStartFiltering() {
    if (!sfState.seed || !sfState.qty) return
    const db = sup()
    const time = nowIST()

    const { error } = await db.from('filtering_entries').insert({
      raw_material_id: sfState.seed.id,
      input_qty_kg: parseFloat(sfState.qty),
      start_time_ist: time.formatted,
      start_epoch: time.epoch,
      location_id: (await db.from('locations').select('location_id').limit(1)).data?.[0]?.location_id,
      created_by: session.user_id
    })

    if (error) {
      setToast({ type: 'error', message: 'Failed to start filtering.' })
      return
    }
    setToast({ type: 'success', message: `Filtering started for ${sfState.seed.name} oil` })
    setActiveFlow(null)
    loadData()
  }

  // ── SUBMIT: Stop Filtering
  async function submitStopFiltering() {
    const entry = sfStopState.entry
    const filteredOil = parseFloat(sfStopState.filteredOil) || 0
    const inputKg = parseFloat(entry.input_qty_kg) || 0

    if (filteredOil > inputKg) {
      setSfStopState(prev => ({ ...prev, error: `Output exceeds input. Input was ${inputKg} kg, but Filtered Oil = ${filteredOil} kg` }))
      return
    }

    const db = sup()
    const time = nowIST()

    const { error } = await db.from('filtering_entries')
      .update({
        filtered_oil_kg: filteredOil,
        stop_time_ist: time.formatted,
        stop_epoch: time.epoch
      })
      .eq('id', entry.id)

    if (error) {
      setToast({ type: 'error', message: 'Failed to stop filtering.' })
      return
    }
    setToast({ type: 'success', message: `Filtering stopped for ${entry.seed_name} oil` })
    setActiveFlow(null)
    loadData()
  }

  if (!session) return null

  // ── Action button definitions
  const idleMachineCount = pressMachines.length - runningBatches.length

  const actions = [
    { key: 'start_extraction', label: 'Start Extraction', icon: 'M12 4.5v15m7.5-7.5H4.5', color: 'emerald', count: idleMachineCount, countLabel: 'idle' },
    { key: 'stop_extraction', label: 'Stop Extraction', icon: 'M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'red', count: runningBatches.length, countLabel: 'running' },
    { key: 'start_filtering', label: 'Start Filtering', icon: 'M3.75 4.5h16.5M3.75 12h16.5m-16.5 7.5h16.5', color: 'blue', count: null, countLabel: null },
    { key: 'stop_filtering', label: 'Stop Filtering', icon: 'M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'amber', count: runningFilters.length, countLabel: 'running' },
  ]

  const colorMap = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-100 text-emerald-600', active: 'border-emerald-500 bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700' },
    red: { bg: 'bg-red-50', border: 'border-red-200', icon: 'bg-red-100 text-red-600', active: 'border-red-500 bg-red-50', badge: 'bg-red-100 text-red-700' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600', active: 'border-blue-500 bg-blue-50', badge: 'bg-blue-100 text-blue-700' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'bg-amber-100 text-amber-600', active: 'border-amber-500 bg-amber-50', badge: 'bg-amber-100 text-amber-700' },
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            <span className="text-sm">Dashboard</span>
          </button>
          <span className="text-sm font-semibold text-gray-800">Production Tracking</span>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">

        {/* ── ACCORDION ─────────────────────────────────────────── */}
        <div className="space-y-2">
          {actions.map(a => {
            const c = colorMap[a.color]
            const isActive = activeFlow === a.key
            return (
              <div key={a.key} className={`rounded-2xl border-2 overflow-hidden transition-all duration-200 ${isActive ? c.active : 'border-gray-200 bg-white'}`}>
                {/* Accordion header — always visible */}
                <button
                  onClick={() => {
                    setActiveFlow(isActive ? null : a.key)
                    if (!isActive) loadData()
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
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.countLabel === 'idle' ? 'bg-gray-100 text-gray-600' : c.badge}`}>{a.count} {a.countLabel}</span>
                    )}
                  </div>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {/* Accordion body — only for the active flow */}
                {isActive && (
                  <div className="px-4 pb-4 pt-1 space-y-4 border-t border-gray-100">

                    {/* START EXTRACTION */}
                    {a.key === 'start_extraction' && (
                      <>
                        <MachineSelector machines={pressMachines.filter(m => !runningBatches.find(b => b.machine_id === m.machine_id))} selected={seState.machine} onSelect={m => setSeState(p => ({ ...p, machine: m }))} />
                        <SeedSelector items={seeds} selected={seState.seed} onSelect={s => setSeState(p => ({ ...p, seed: s }))} label="Select Seed" />
                        <QtyInput value={seState.qty} onChange={v => setSeState(p => ({ ...p, qty: v }))} unit={seState.unit} onUnitChange={u => setSeState(p => ({ ...p, unit: u }))} label="Seed Input Quantity" />
                        <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center justify-between">
                          <span className="text-xs text-gray-500 font-medium">Start Time (auto)</span>
                          <span className="text-xs font-semibold text-gray-700">{formatIST(new Date())}</span>
                        </div>
                        <button
                          onClick={submitStartExtraction}
                          disabled={!seState.machine || !seState.seed || !seState.qty}
                          className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-700 active:scale-95"
                        >
                          Start Extraction
                        </button>
                      </>
                    )}

                    {/* STOP EXTRACTION */}
                    {a.key === 'stop_extraction' && (
                      <>
                        {runningBatches.length === 0 ? (
                          <div className="text-center py-6">
                            <p className="text-gray-400 text-sm">No machines currently running</p>
                          </div>
                        ) : (
                          <>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Running Machine</label>
                              <div className="space-y-2">
                                {runningBatches.map(b => (
                                  <RunningCard key={b.id} item={b} selected={soState.batch} onSelect={m => setSoState({ batch: m, oil: '', cake: '', error: null })} type="extraction" />
                                ))}
                              </div>
                            </div>
                            {soState.batch && (
                              <>
                                <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center justify-between">
                                  <span className="text-xs text-gray-500 font-medium">Input provided</span>
                                  <span className="text-xs font-bold text-gray-700">{soState.batch.input_qty} {soState.batch.unit || 'kg'}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <OutputRow label="Oil Extracted" value={soState.oil} onChange={v => setSoState(p => ({ ...p, oil: v, error: null }))} error={soState.error && soState.oil} />
                                  <OutputRow label="Cake Extracted" value={soState.cake} onChange={v => setSoState(p => ({ ...p, cake: v, error: null }))} error={soState.error && soState.cake} />
                                </div>
                                {soState.error && (
                                  <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                                    <p className="text-xs text-red-600 font-medium">{soState.error}</p>
                                  </div>
                                )}
                                <button
                                  onClick={submitStopExtraction}
                                  disabled={!soState.oil && !soState.cake}
                                  className="w-full py-3 rounded-xl bg-red-600 text-white text-sm font-bold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-700 active:scale-95"
                                >
                                  Stop Extraction
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </>
                    )}

                    {/* START FILTERING */}
                    {a.key === 'start_filtering' && (
                      runningFilters.length > 0 ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                          <svg className="w-8 h-8 text-amber-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v3.75m-9.303 3.376a12 12 0 1021.593 0M12 15.75h.007v.008H12v-.008z" />
                          </svg>
                          <p className="text-sm font-semibold text-amber-800">No filter machine is idle</p>
                          <p className="text-xs text-amber-600 mt-1">Complete the existing {runningFilters[0]?.seed_name} filtration first before starting a new one.</p>
                        </div>
                      ) : (
                        <>
                          <SeedSelector items={seeds} selected={sfState.seed} onSelect={s => setSfState(p => ({ ...p, seed: s }))} label="Select Oil Type" />
                          <QtyInput value={sfState.qty} onChange={v => setSfState(p => ({ ...p, qty: v }))} unit="kg" onUnitChange={() => {}} label="Unfiltered Oil Input (kg)" />
                          <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                            </svg>
                            <span className="text-xs text-blue-600 font-medium">Filtering Machine (single unit) - auto assigned</span>
                          </div>
                          <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center justify-between">
                            <span className="text-xs text-gray-500 font-medium">Start Time (auto)</span>
                            <span className="text-xs font-semibold text-gray-700">{formatIST(new Date())}</span>
                          </div>
                          <button
                            onClick={submitStartFiltering}
                            disabled={!sfState.seed || !sfState.qty}
                            className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 active:scale-95"
                          >
                            Start Filtering
                          </button>
                        </>
                      )
                    )}

                    {/* STOP FILTERING */}
                    {a.key === 'stop_filtering' && (
                      <>
                        {runningFilters.length === 0 ? (
                          <div className="text-center py-6">
                            <p className="text-gray-400 text-sm">No filtering currently in progress</p>
                          </div>
                        ) : (
                          <>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Running Filter</label>
                              <div className="space-y-2">
                                {runningFilters.map(f => (
                                  <RunningCard key={f.id} item={f} selected={sfStopState.entry} onSelect={m => setSfStopState({ entry: m, filteredOil: '', error: null })} type="filtering" />
                                ))}
                              </div>
                            </div>
                            {sfStopState.entry && (
                              <>
                                <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center justify-between">
                                  <span className="text-xs text-gray-500 font-medium">Input provided</span>
                                  <span className="text-xs font-bold text-gray-700">{sfStopState.entry.input_qty_kg} kg</span>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Filtered Oil Collected</label>
                                  <div className="flex gap-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={sfStopState.filteredOil}
                                      onChange={e => setSfStopState(p => ({ ...p, filteredOil: e.target.value, error: null }))}
                                      placeholder="0.00"
                                      className={`flex-1 px-3 py-2.5 rounded-xl border-2 text-sm font-medium outline-none transition-colors ${sfStopState.error ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-emerald-400'}`}
                                    />
                                    <span className="px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600">kg</span>
                                  </div>
                                </div>
                                {sfStopState.error && (
                                  <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                                    <p className="text-xs text-red-600 font-medium">{sfStopState.error}</p>
                                  </div>
                                )}
                                <button
                                  onClick={submitStopFiltering}
                                  disabled={!sfStopState.filteredOil}
                                  className="w-full py-3 rounded-xl bg-amber-600 text-white text-sm font-bold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-700 active:scale-95"
                                >
                                  Stop Filtering
                                </button>
                              </>
                            )}
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
