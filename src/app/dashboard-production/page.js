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

// ─── Date range helpers ───────────────────────────────────────────────────
const PRESETS = [
  { key: '1d',  label: '1D',  days: 1 },
  { key: '7d',  label: '7D',  days: 7 },
  { key: '15d', label: '15D', days: 15 },
  { key: '30d', label: '30D', days: 30 },
]

function getEpochRange(preset, customFrom, customTo) {
  const now = new Date()
  if (preset === 'custom' && customFrom && customTo) {
    // customFrom / customTo are YYYY-MM-DD strings; treat as IST midnight boundaries
    const fromIST = new Date(customFrom + 'T00:00:00+05:30')
    const toIST   = new Date(customTo   + 'T23:59:59+05:30')
    return { fromEpoch: fromIST.getTime(), toEpoch: toIST.getTime() }
  }
  const p = PRESETS.find(p => p.key === preset) || PRESETS[3]
  // "last N days" = from start-of-today-IST minus (N-1) days, to end-of-today-IST
  const todayIST = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
  const y = todayIST.getUTCFullYear(), m = todayIST.getUTCMonth(), d = todayIST.getUTCDate()
  const startOfTodayIST = new Date(Date.UTC(y, m, d) - 5.5 * 60 * 60 * 1000) // midnight IST as UTC ms
  const fromEpoch = startOfTodayIST.getTime() - (p.days - 1) * 86400000
  const toEpoch   = startOfTodayIST.getTime() + 86400000 - 1 // 23:59:59.999 IST today
  return { fromEpoch, toEpoch }
}

function maxCustomDate() {
  // today in YYYY-MM-DD (IST)
  const now = new Date()
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth()+1).padStart(2,'0')}-${String(ist.getUTCDate()).padStart(2,'0')}`
}

function minCustomDate() {
  // 365 days ago in YYYY-MM-DD (IST)
  const now = new Date()
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000 - 365 * 86400000)
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth()+1).padStart(2,'0')}-${String(ist.getUTCDate()).padStart(2,'0')}`
}

// ─── Readable date label from epoch (IST) ────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function formatDateLabel(epochMs) {
  const ist = new Date(epochMs + 5.5 * 60 * 60 * 1000)
  return `${String(ist.getUTCDate()).padStart(2, '0')} ${MONTHS[ist.getUTCMonth()]}`
}

// ─── Number formatting ────────────────────────────────────────────────────
function fmt(n) {
  if (n == null || isNaN(n)) return '0'
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtInt(n) {
  if (n == null || isNaN(n)) return '0'
  return Number(n).toLocaleString('en-IN')
}
function pct(n) {
  if (n == null || isNaN(n)) return '0.00%'
  return Number(n).toFixed(2) + '%'
}

// ─── DateRange picker bar ─────────────────────────────────────────────────
function DateRangeBar({ preset, onPreset, customFrom, customTo, onCustomFrom, onCustomTo }) {
  const today = maxCustomDate()
  const minDate = minCustomDate()

  // Compute the resolved range for the label (presets only)
  const resolvedRange = preset !== 'custom' ? getEpochRange(preset, customFrom, customTo) : null

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => onPreset(p.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              preset === p.key
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-400'
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => onPreset('custom')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            preset === 'custom'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-400'
          }`}
        >
          Custom
        </button>
        {preset === 'custom' && (
          <div className="flex items-center gap-1.5 ml-1">
            <input
              type="date"
              value={customFrom}
              min={minDate}
              max={customTo || today}
              onChange={e => onCustomFrom(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 outline-none focus:border-emerald-400"
            />
            <span className="text-xs text-gray-400">→</span>
            <input
              type="date"
              value={customTo}
              min={customFrom || minDate}
              max={today}
              onChange={e => onCustomTo(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 outline-none focus:border-emerald-400"
            />
          </div>
        )}
      </div>

      {/* Resolved date label — only for presets */}
      {resolvedRange && (
        <p className="text-xs text-gray-400">
          {formatDateLabel(resolvedRange.fromEpoch)} &ndash; {formatDateLabel(resolvedRange.toEpoch)}
        </p>
      )}
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────
function KpiCard({ label, value, unit, color }) {
  const colors = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    blue:    'bg-blue-50 border-blue-200 text-blue-700',
    violet:  'bg-violet-50 border-violet-200 text-violet-700',
    amber:   'bg-amber-50 border-amber-200 text-amber-700',
  }
  return (
    <div className={`rounded-xl border p-3.5 ${colors[color] || colors.emerald}`}>
      <p className="text-xs font-semibold opacity-70 mb-1">{label}</p>
      <p className="text-xl font-bold">{value}<span className="text-xs font-semibold opacity-60 ml-1">{unit}</span></p>
    </div>
  )
}

// ─── Section header with toggle ───────────────────────────────────────────
function SectionHeader({ title, icon, color, open, onToggle, children }) {
  const colors = {
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: open ? 'border-emerald-300' : 'border-gray-200' },
    blue:    { bg: 'bg-blue-100',    text: 'text-blue-700',    border: open ? 'border-blue-300'   : 'border-gray-200' },
    violet:  { bg: 'bg-violet-100',  text: 'text-violet-700',  border: open ? 'border-violet-300' : 'border-gray-200' },
  }
  const c = colors[color] || colors.emerald
  return (
    <div className={`rounded-2xl border-2 overflow-hidden bg-white ${c.border} transition-colors`}>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 ${c.bg} ${c.text} rounded-xl flex items-center justify-center flex-shrink-0`}>
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-800">{title}</span>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t border-gray-100">{children}</div>}
    </div>
  )
}

// ─── Drill-down table (generic) ───────────────────────────────────────────
function DrillTable({ headers, rows, emptyMsg }) {
  if (!rows || rows.length === 0) {
    return <p className="text-xs text-gray-400 text-center py-4">{emptyMsg || 'No data'}</p>
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 mt-3">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-gray-50">
            {headers.map((h, i) => (
              <th key={i} className={`px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h.right ? 'text-right' : ''}`}>{h.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
              {row.map((cell, j) => (
                <td key={j} className={`px-3 py-2 text-xs text-gray-700 ${headers[j]?.right ? 'text-right font-semibold' : ''}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Drill toggle pills ───────────────────────────────────────────────────
function DrillToggle({ active, onChange }) {
  const options = ['seed', 'machine', 'operator']
  return (
    <div className="flex gap-1.5 mt-3">
      {options.map(o => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
            active === o ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {o.charAt(0).toUpperCase() + o.slice(1)}
        </button>
      ))}
    </div>
  )
}

function FilterDrillToggle({ active, onChange }) {
  return (
    <div className="flex gap-1.5 mt-3">
      <button
        onClick={() => onChange('seed')}
        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
          active === 'seed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
      >
        Seed
      </button>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ──────────────────────────────────────────────────────────────────────────
export default function DashboardProductionPage() {
  const router = useRouter()
  const [session, setSession] = useState(null)

  // Date range state
  const [preset, setPreset]       = useState('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')

  // Section open/close
  const [openSection, setOpenSection] = useState('extraction') // default open

  // Drill-down view per section
  const [exDrill, setExDrill] = useState('seed')
  const [fiDrill, setFiDrill] = useState('seed')

  // Raw data
  const [extractionData, setExtractionData] = useState([])
  const [filtrationData, setFiltrationData] = useState([])
  const [bottlingData,   setBottlingData]   = useState([])
  const [machines,       setMachines]       = useState([])
  const [users,          setUsers]          = useState([])
  const [rawMaterials,   setRawMaterials]   = useState([])
  const [skus,           setSkus]           = useState([])
  const [products,       setProducts]       = useState([])

  const [loading, setLoading] = useState(true)

  // ── Auth
  useEffect(() => {
    const s = getSession()
    if (!s) { router.push('/login'); return }
    setSession(s)
  }, [router])

  // ── Fetch master data once
  const loadMasters = useCallback(async () => {
    const db = sup()
    const [mRes, uRes, rmRes, skRes, prRes] = await Promise.all([
      db.from('machines').select('machine_id, machine_code, machine_name').eq('status', 'active'),
      db.from('users').select('user_id, full_name'),
      db.from('raw_materials').select('id, name'),
      db.from('skus').select('sku_id, product_id, variant_name, size_value, size_unit, sku_code').eq('is_active', true),
      db.from('products').select('product_id, product_name').eq('is_active', true),
    ])
    setMachines(mRes.data || [])
    setUsers(uRes.data || [])
    setRawMaterials(rmRes.data || [])
    setSkus(skRes.data || [])
    setProducts(prRes.data || [])
  }, [])

  // ── Fetch production data for current date range
  const loadData = useCallback(async () => {
    setLoading(true)
    const db = sup()
    const { fromEpoch, toEpoch } = getEpochRange(preset, customFrom, customTo)

    const [exRes, fiRes, boRes] = await Promise.all([
      // Extraction: completed batches in range
      db.from('production_batches')
        .select('batch_id, seed_type, seed_input_kg, oil_output_kg, machine_id, created_by, start_epoch')
        .eq('batch_status', 'completed')
        .eq('is_deleted', false)
        .gte('start_epoch', fromEpoch)
        .lte('start_epoch', toEpoch),

      // Filtration: completed filtering (stop_epoch NOT null) in range
      db.from('filtering_entries')
        .select('id, raw_material_id, input_qty_kg, filtered_oil_kg, start_epoch')
        .not('stop_epoch', 'is', null)
        .eq('is_deleted', false)
        .gte('start_epoch', fromEpoch)
        .lte('start_epoch', toEpoch),

      // Bottling: all non-deleted in range
      db.from('bottling_entries')
        .select('id, product_id, sku_id, bottles_filled, bottled_at_epoch')
        .eq('is_deleted', false)
        .gte('bottled_at_epoch', fromEpoch)
        .lte('bottled_at_epoch', toEpoch),
    ])

    setExtractionData(exRes.data || [])
    setFiltrationData(fiRes.data || [])
    setBottlingData(boRes.data || [])
    setLoading(false)
  }, [preset, customFrom, customTo])

  useEffect(() => {
    if (session) {
      loadMasters()
      loadData()
    }
  }, [session, loadMasters, loadData])

  // Re-fetch when date range changes (loadData already in deps via useCallback)
  useEffect(() => {
    if (session) loadData()
  }, [session, loadData])

  if (!session) return null

  // ── Derived: Extraction KPIs
  const totalSeedInput   = extractionData.reduce((s, r) => s + parseFloat(r.seed_input_kg || 0), 0)
  const totalOilExtracted = extractionData.reduce((s, r) => s + parseFloat(r.oil_output_kg || 0), 0)
  const avgExtractionPct  = totalSeedInput > 0 ? (totalOilExtracted / totalSeedInput) * 100 : 0
  const totalExtractionBatches = extractionData.length

  // ── Derived: Filtration KPIs
  const totalUnfiltered   = filtrationData.reduce((s, r) => s + parseFloat(r.input_qty_kg || 0), 0)
  const totalFiltered     = filtrationData.reduce((s, r) => s + parseFloat(r.filtered_oil_kg || 0), 0)
  const avgFiltrationPct  = totalUnfiltered > 0 ? (totalFiltered / totalUnfiltered) * 100 : 0
  const totalFiltrationRuns = filtrationData.length

  // ── Derived: Bottling KPIs
  const totalBottlesFilled = bottlingData.reduce((s, r) => s + (r.bottles_filled || 0), 0)
  const totalBottlingRuns   = bottlingData.length
  // unique SKUs bottled
  const uniqueSkusBottled   = [...new Set(bottlingData.map(r => r.sku_id))].length

  // ── Drill helpers: group-by and summarize

  // Extraction by seed
  function exBySeed() {
    const map = {}
    extractionData.forEach(r => {
      const k = r.seed_type || 'Unknown'
      if (!map[k]) map[k] = { input: 0, oil: 0, batches: 0 }
      map[k].input += parseFloat(r.seed_input_kg || 0)
      map[k].oil   += parseFloat(r.oil_output_kg || 0)
      map[k].batches++
    })
    return Object.entries(map).sort((a, b) => b[1].input - a[1].input).map(([seed, d]) => [
      seed,
      fmt(d.input) + ' kg',
      fmt(d.oil) + ' kg',
      pct(d.input > 0 ? (d.oil / d.input) * 100 : 0),
      fmtInt(d.batches),
    ])
  }

  // Extraction by machine
  function exByMachine() {
    const map = {}
    extractionData.forEach(r => {
      const m = machines.find(m => m.machine_id === r.machine_id)
      const k = m ? `${m.machine_code} — ${m.machine_name}` : 'Unknown'
      if (!map[k]) map[k] = { input: 0, oil: 0, batches: 0 }
      map[k].input += parseFloat(r.seed_input_kg || 0)
      map[k].oil   += parseFloat(r.oil_output_kg || 0)
      map[k].batches++
    })
    return Object.entries(map).sort((a, b) => b[1].input - a[1].input).map(([machine, d]) => [
      machine,
      fmt(d.input) + ' kg',
      fmt(d.oil) + ' kg',
      pct(d.input > 0 ? (d.oil / d.input) * 100 : 0),
      fmtInt(d.batches),
    ])
  }

  // Extraction by operator
  function exByOperator() {
    const map = {}
    extractionData.forEach(r => {
      const u = users.find(u => u.user_id === r.created_by)
      const k = u ? u.full_name : 'Unknown'
      if (!map[k]) map[k] = { input: 0, oil: 0, batches: 0 }
      map[k].input += parseFloat(r.seed_input_kg || 0)
      map[k].oil   += parseFloat(r.oil_output_kg || 0)
      map[k].batches++
    })
    return Object.entries(map).sort((a, b) => b[1].input - a[1].input).map(([op, d]) => [
      op,
      fmt(d.input) + ' kg',
      fmt(d.oil) + ' kg',
      pct(d.input > 0 ? (d.oil / d.input) * 100 : 0),
      fmtInt(d.batches),
    ])
  }

  // Filtration by seed
  function fiBySeed() {
    const map = {}
    filtrationData.forEach(r => {
      const rm = rawMaterials.find(m => m.id === r.raw_material_id)
      const k = rm ? rm.name : 'Unknown'
      if (!map[k]) map[k] = { input: 0, filtered: 0, runs: 0 }
      map[k].input    += parseFloat(r.input_qty_kg || 0)
      map[k].filtered += parseFloat(r.filtered_oil_kg || 0)
      map[k].runs++
    })
    return Object.entries(map).sort((a, b) => b[1].input - a[1].input).map(([seed, d]) => [
      seed,
      fmt(d.input) + ' kg',
      fmt(d.filtered) + ' kg',
      pct(d.input > 0 ? (d.filtered / d.input) * 100 : 0),
      fmtInt(d.runs),
    ])
  }

  // Bottling by SKU
  function boBySkuList() {
    const map = {}
    bottlingData.forEach(r => {
      const sku = skus.find(s => s.sku_id === r.sku_id)
      const prod = sku ? products.find(p => p.product_id === sku.product_id) : null
      const k = sku ? sku.sku_id : 'Unknown'
      if (!map[k]) map[k] = { bottles: 0, runs: 0, skuLabel: sku ? `${sku.variant_name || sku.sku_code}` : 'Unknown', prodName: prod ? prod.product_name : '—', size: sku ? `${sku.size_value} ${sku.size_unit}` : '—' }
      map[k].bottles += r.bottles_filled || 0
      map[k].runs++
    })
    return Object.entries(map).sort((a, b) => b[1].bottles - a[1].bottles).map(([, d]) => [
      d.prodName,
      d.size,
      d.skuLabel,
      fmtInt(d.bottles),
      fmtInt(d.runs),
    ])
  }

  // ── Render drill table for extraction
  function renderExtractionDrill() {
    const headers = exDrill === 'seed'
      ? [{ label: 'Seed' }, { label: 'Input', right: true }, { label: 'Oil Out', right: true }, { label: 'Ext %', right: true }, { label: 'Batches', right: true }]
      : exDrill === 'machine'
        ? [{ label: 'Machine' }, { label: 'Input', right: true }, { label: 'Oil Out', right: true }, { label: 'Ext %', right: true }, { label: 'Batches', right: true }]
        : [{ label: 'Operator' }, { label: 'Input', right: true }, { label: 'Oil Out', right: true }, { label: 'Ext %', right: true }, { label: 'Batches', right: true }]

    const rows = exDrill === 'seed' ? exBySeed() : exDrill === 'machine' ? exByMachine() : exByOperator()
    return <DrillTable headers={headers} rows={rows} emptyMsg="No completed extractions in this period" />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700">
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span className="text-sm">Home</span>
          </button>
          <span className="text-sm font-semibold text-gray-800">Production Dashboard</span>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* Date range bar */}
        <DateRangeBar
          preset={preset}
          onPreset={setPreset}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFrom={setCustomFrom}
          onCustomTo={setCustomTo}
        />

        {loading && (
          <div className="text-center py-8">
            <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" style={{ borderWidth: '3px' }} />
            <p className="text-xs text-gray-500">Loading...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* ═══════════════════════════════════════════════════════════════
                EXTRACTION SUMMARY
            ═══════════════════════════════════════════════════════════════ */}
            <SectionHeader
              title="Extraction Summary"
              icon="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              color="emerald"
              open={openSection === 'extraction'}
              onToggle={() => setOpenSection(openSection === 'extraction' ? null : 'extraction')}
            >
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <KpiCard label="Total Seed Input"    value={fmt(totalSeedInput)}       unit="kg"  color="emerald" />
                <KpiCard label="Total Oil Extracted"  value={fmt(totalOilExtracted)}   unit="kg"  color="emerald" />
                <KpiCard label="Avg Extraction %"     value={pct(avgExtractionPct)}    unit=""    color="amber"   />
                <KpiCard label="Batches Completed"    value={fmtInt(totalExtractionBatches)} unit=""  color="emerald" />
              </div>

              {/* Drill toggle + table */}
              <DrillToggle active={exDrill} onChange={setExDrill} />
              {renderExtractionDrill()}
            </SectionHeader>

            {/* ═══════════════════════════════════════════════════════════════
                FILTRATION SUMMARY
            ═══════════════════════════════════════════════════════════════ */}
            <SectionHeader
              title="Filtration Summary"
              icon="M3.75 4.5h16.5M3.75 12h16.5m-16.5 7.5h16.5"
              color="blue"
              open={openSection === 'filtration'}
              onToggle={() => setOpenSection(openSection === 'filtration' ? null : 'filtration')}
            >
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <KpiCard label="Total Unfiltered In"  value={fmt(totalUnfiltered)}     unit="kg"  color="blue"  />
                <KpiCard label="Total Filtered Out"   value={fmt(totalFiltered)}       unit="kg"  color="blue"  />
                <KpiCard label="Avg Filtration %"     value={pct(avgFiltrationPct)}    unit=""    color="amber" />
                <KpiCard label="Filtration Runs"      value={fmtInt(totalFiltrationRuns)} unit=""  color="blue"  />
              </div>

              {/* Drill: seed only for filtration */}
              <FilterDrillToggle active={fiDrill} onChange={setFiDrill} />
              <DrillTable
                headers={[{ label: 'Seed' }, { label: 'Input', right: true }, { label: 'Filtered', right: true }, { label: 'Filt %', right: true }, { label: 'Runs', right: true }]}
                rows={fiBySeed()}
                emptyMsg="No completed filtrations in this period"
              />
            </SectionHeader>

            {/* ═══════════════════════════════════════════════════════════════
                BOTTLING SUMMARY
            ═══════════════════════════════════════════════════════════════ */}
            <SectionHeader
              title="Bottling Summary"
              icon="M9 3h6v2a2 2 0 012 2v1a1 1 0 011 1v11a2 2 0 01-2 2H8a2 2 0 01-2-2V9a1 1 0 011-1V7a2 2 0 012-2V3z"
              color="violet"
              open={openSection === 'bottling'}
              onToggle={() => setOpenSection(openSection === 'bottling' ? null : 'bottling')}
            >
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <KpiCard label="Total Bottles Filled" value={fmtInt(totalBottlesFilled)} unit=""    color="violet" />
                <KpiCard label="Unique SKUs Bottled"   value={fmtInt(uniqueSkusBottled)}  unit=""    color="violet" />
                <KpiCard label="Bottling Runs"         value={fmtInt(totalBottlingRuns)}  unit=""    color="violet" />
                <KpiCard label="Avg Bottles / Run"     value={totalBottlingRuns > 0 ? fmtInt(Math.round(totalBottlesFilled / totalBottlingRuns)) : '0'} unit="" color="amber" />
              </div>

              {/* SKU breakdown table */}
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-1">SKU Breakdown</p>
              <DrillTable
                headers={[{ label: 'Oil' }, { label: 'Size' }, { label: 'SKU' }, { label: 'Bottles', right: true }, { label: 'Runs', right: true }]}
                rows={boBySkuList()}
                emptyMsg="No bottling entries in this period"
              />
            </SectionHeader>
          </>
        )}
      </main>
    </div>
  )
}
