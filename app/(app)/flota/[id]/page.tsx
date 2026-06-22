'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  ArrowLeft, Save, Anchor, Upload, Trash2, X,
  Camera, CheckCircle, AlertCircle, Tag, Wrench,
  Plus, Clock, Info,
} from 'lucide-react'
import type { BoatStatus } from '@/types'

const BOAT_TYPES = ['Lancha', 'Lancha grande', 'Catamarán', 'Velero', 'RIB', 'Moto de agua', 'Sin licencia', 'Motor', 'Otro']
const STATUSES: { value: BoatStatus; label: string; color: string }[] = [
  { value: 'available',   label: 'Disponible',    color: 'text-green-400 border-green-400/40 bg-green-400/10' },
  { value: 'rented',      label: 'Alquilado',     color: 'text-blue-400 border-blue-400/40 bg-blue-400/10' },
  { value: 'maintenance', label: 'Mantenimiento', color: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10' },
  { value: 'inactive',    label: 'Inactivo',      color: 'text-red-400 border-red-400/40 bg-red-400/10' },
]

const SEASON_LABELS: Record<string, string> = {
  MAY_OCT: 'May / Oct', JUN_SEP: 'Jun / Sep', JUL_AGO: 'Jul / Ago',
  JUN: 'Junio', JUL: 'Julio', AGO: 'Agosto', SEP: 'Septiembre',
}
const TARIFF_LABELS: Record<string, { label: string; color: string }> = {
  sin_incluido: { label: 'Sin patrón ni fuel',     color: 'text-gray-300' },
  patron_fuel:  { label: 'Patrón + Fuel incluido', color: 'text-[#C9A84C]' },
  es_vedra:     { label: 'Es Vedrà (Full Day)',     color: 'text-blue-400' },
  formentera:   { label: 'Formentera (Full Day)',   color: 'text-purple-400' },
}
const DURATION_LABELS: Record<string, string> = { half: 'Medio día', full: 'Día completo' }
const SEASON_ORDER = ['MAY_OCT', 'JUN_SEP', 'JUN', 'JUL', 'AGO', 'SEP', 'JUL_AGO']

const inputCls = 'w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C9A84C]/50'
const labelCls = 'text-gray-400 text-xs mb-1.5 block'

// ── PRICE CELL ──────────────────────────────────────────────────────
function PriceCell({ row, onSave }: { row: any; onSave: (id: string, price: number, fuel_extra: number | null) => void }) {
  const [editing, setEditing] = useState(false)
  const [price, setPrice] = useState(String(row.price))
  const [fuel, setFuel] = useState(row.fuel_extra ? String(row.fuel_extra) : '')

  function save() { onSave(row.id, Number(price), fuel ? Number(fuel) : null); setEditing(false) }

  if (editing) return (
    <td className="px-3 py-2">
      <div className="flex items-center gap-1">
        <input value={price} onChange={e => setPrice(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && save()}
          className="w-20 px-2 py-1 bg-white border border-[#C9A84C]/50 rounded text-gray-900 text-xs text-right focus:outline-none" />
        <span className="text-gray-400 text-xs">€</span>
        {row.fuel_extra !== null && <>
          <span className="text-gray-400 text-xs">+</span>
          <input value={fuel} onChange={e => setFuel(e.target.value)} placeholder="fuel"
            className="w-16 px-2 py-1 bg-white border border-[#C9A84C]/50 rounded text-gray-900 text-xs text-right focus:outline-none" />
        </>}
        <button onClick={save} className="text-green-400 hover:text-green-300"><CheckCircle size={13} /></button>
        <button onClick={() => { setEditing(false); setPrice(String(row.price)) }} className="text-red-400 hover:text-red-300"><X size={13} /></button>
      </div>
    </td>
  )

  return (
    <td className="px-3 py-2 text-right">
      <button onClick={() => setEditing(true)} className="group flex items-center gap-1.5 ml-auto hover:text-[#C9A84C] transition-colors">
        <span className="text-gray-900 font-semibold">{Number(row.price).toLocaleString('es-ES')}€</span>
        {row.fuel_extra && <span className="text-gray-400 text-xs">+{row.fuel_extra}€ fuel</span>}
      </button>
    </td>
  )
}

// ── PRECIOS TAB ─────────────────────────────────────────────────────
function PreciosTab({ boatId }: { boatId: string }) {
  const [pricing, setPricing] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [boatId])

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('boat_pricing').select('*').eq('boat_id', boatId).order('season').order('tariff').order('duration')
    setPricing(data ?? [])
    setLoading(false)
  }

  async function handleSavePrice(id: string, price: number, fuel_extra: number | null) {
    const supabase = createClient()
    await supabase.from('boat_pricing').update({ price, fuel_extra }).eq('id', id)
    load()
  }

  if (loading) return <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" /></div>

  const bySeason = SEASON_ORDER.reduce<Record<string, any[]>>((acc, s) => {
    const rows = pricing.filter(r => r.season === s)
    if (rows.length) acc[s] = rows
    return acc
  }, {})

  if (pricing.length === 0) return (
    <div className="text-center py-16 text-gray-400 text-sm">
      <Tag size={32} className="mx-auto mb-3 text-gray-300" />
      No hay tarifas configuradas para este barco
    </div>
  )

  return (
    <div className="space-y-4">
      {Object.entries(bySeason).map(([season, rows]) => (
        <div key={season} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <p className="text-gray-900 font-semibold text-sm">{SEASON_LABELS[season] ?? season}</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-3 py-2 text-gray-400 text-xs font-medium">Tarifa</th>
                <th className="text-left px-3 py-2 text-gray-400 text-xs font-medium">Duración</th>
                <th className="text-right px-3 py-2 text-gray-400 text-xs font-medium">Precio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(row => {
                const t = TARIFF_LABELS[row.tariff]
                return (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-medium ${t?.color ?? 'text-gray-400'}`}>{t?.label ?? row.tariff}</span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-400 text-xs">{DURATION_LABELS[row.duration] ?? row.duration}</td>
                    <PriceCell row={row} onSave={handleSavePrice} />
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

// ── MANTENIMIENTO TAB ───────────────────────────────────────────────
function MantenimientoTab({ boatId }: { boatId: string }) {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', scheduled_date: '', priority: 'medium' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [boatId])

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('maintenance').select('*').eq('boat_id', boatId).order('scheduled_date', { ascending: true })
    setTasks(data ?? [])
    setLoading(false)
  }

  async function markComplete(id: string) {
    const supabase = createClient()
    await supabase.from('maintenance').update({ is_completed: true, completed_date: new Date().toISOString().split('T')[0] }).eq('id', id)
    load()
  }

  async function addTask() {
    if (!form.title) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('maintenance').insert({ boat_id: boatId, title: form.title, description: form.description || null, scheduled_date: form.scheduled_date || null, priority: form.priority })
    setForm({ title: '', description: '', scheduled_date: '', priority: 'medium' })
    setShowForm(false)
    setSaving(false)
    load()
  }

  async function deleteTask(id: string) {
    const supabase = createClient()
    await supabase.from('maintenance').delete().eq('id', id)
    load()
  }

  const pending   = tasks.filter(t => !t.is_completed)
  const completed = tasks.filter(t => t.is_completed)
  const overdue   = pending.filter(t => t.scheduled_date && new Date(t.scheduled_date) < new Date())

  const priorityColor: Record<string, string> = {
    low:      'text-gray-400 bg-gray-400/10 border-gray-400/20',
    medium:   'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    high:     'text-orange-400 bg-orange-400/10 border-orange-400/20',
    critical: 'text-red-400 bg-red-400/10 border-red-400/20',
  }
  const priorityLabel: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica' }

  if (loading) return <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pendientes', value: pending.length,   icon: Clock,        color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
          { label: 'Vencidas',   value: overdue.length,   icon: AlertCircle,  color: 'text-red-400',    bg: 'bg-red-400/10' },
          { label: 'Completadas',value: completed.length, icon: CheckCircle,  color: 'text-green-400',  bg: 'bg-green-400/10' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon size={15} className={s.color} />
            </div>
            <div>
              <p className="text-gray-900 text-lg font-bold">{s.value}</p>
              <p className="text-gray-400 text-xs">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] hover:bg-[#E8C97A] text-black text-sm font-semibold rounded-lg transition-colors">
          <Plus size={15} /> Nueva tarea
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-[#C9A84C]/30 rounded-xl p-5 space-y-3">
          <h3 className="text-gray-900 font-semibold text-sm">Nueva tarea de mantenimiento</h3>
          <div>
            <label className={labelCls}>Título *</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputCls} placeholder="Ej: Cambio de aceite" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Fecha programada</label>
              <input type="date" value={form.scheduled_date} onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Prioridad</label>
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className={inputCls}>
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Descripción</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className={inputCls + ' resize-none'} />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-2 text-gray-400 hover:text-gray-900 text-sm transition-colors">Cancelar</button>
            <button onClick={addTask} disabled={saving || !form.title}
              className="px-4 py-2 bg-[#C9A84C] hover:bg-[#E8C97A] disabled:opacity-60 text-black text-sm font-semibold rounded-lg transition-colors">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm bg-white border border-gray-200 rounded-xl">
          <Wrench size={32} className="mx-auto mb-3 text-gray-300" />
          No hay tareas de mantenimiento
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => {
            const isOverdue = !task.is_completed && task.scheduled_date && new Date(task.scheduled_date) < new Date()
            return (
              <div key={task.id} className={`bg-white border rounded-xl p-4 flex items-start gap-3 ${isOverdue ? 'border-red-500/30' : 'border-gray-200'}`}>
                <button onClick={() => !task.is_completed && markComplete(task.id)}
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors flex items-center justify-center
                    ${task.is_completed ? 'bg-green-400 border-green-400' : 'border-[#3A3A3A] hover:border-[#C9A84C]'}`}>
                  {task.is_completed && <CheckCircle size={12} className="text-black" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-medium ${task.is_completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>
                    {task.priority && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${priorityColor[task.priority]}`}>
                        {priorityLabel[task.priority]}
                      </span>
                    )}
                    {isOverdue && <span className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-full">Vencida</span>}
                  </div>
                  {task.description && <p className="text-gray-400 text-xs mt-1">{task.description}</p>}
                  {task.scheduled_date && (
                    <p className="text-gray-400 text-xs mt-1 flex items-center gap-1">
                      <Clock size={10} /> {new Date(task.scheduled_date).toLocaleDateString('es-ES')}
                      {task.is_completed && task.completed_date && ` · Completada ${new Date(task.completed_date).toLocaleDateString('es-ES')}`}
                    </p>
                  )}
                </div>
                <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── MAIN PAGE ───────────────────────────────────────────────────────
export default function BoatDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<'info' | 'precios' | 'mantenimiento'>('info')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [boatName, setBoatName] = useState('')

  const [form, setForm] = useState({
    name: '', model: '', type: '', year: '', length_meters: '',
    capacity: '', cabins: '', status: 'available' as BoatStatus,
    hourly_rate: '', half_day_rate: '', full_day_rate: '', weekly_rate: '',
    deposit: '', fuel_included: false, captain_required: false,
    registration_number: '', insurance_expiry: '', next_maintenance: '',
    description: '', notes: '', image_url: '',
  })

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    const supabase = createClient()
    supabase.from('boats').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        setBoatName(data.name ?? '')
        setForm({
          name: data.name ?? '', model: data.model ?? '', type: data.type ?? '',
          year: data.year ? String(data.year) : '',
          length_meters: data.length_meters ? String(data.length_meters) : '',
          capacity: data.capacity ? String(data.capacity) : '',
          cabins: data.cabins ? String(data.cabins) : '',
          status: data.status ?? 'available',
          hourly_rate: data.hourly_rate ? String(data.hourly_rate) : '',
          half_day_rate: data.half_day_rate ? String(data.half_day_rate) : '',
          full_day_rate: data.full_day_rate ? String(data.full_day_rate) : '',
          weekly_rate: data.weekly_rate ? String(data.weekly_rate) : '',
          deposit: data.deposit ? String(data.deposit) : '',
          fuel_included: data.fuel_included ?? false,
          captain_required: data.captain_required ?? false,
          registration_number: data.registration_number ?? '',
          insurance_expiry: data.insurance_expiry ?? '',
          next_maintenance: data.next_maintenance ?? '',
          description: data.description ?? '', notes: data.notes ?? '',
          image_url: data.image_url ?? '',
        })
      }
      setLoading(false)
    })
  }, [id])

  async function handleUpload(file: File) {
    setUploading(true); setError('')
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${id}/main.${ext}`
    const { error: upErr } = await supabase.storage.from('boat-images').upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) { setError('Error al subir: ' + upErr.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('boat-images').getPublicUrl(path)
    set('image_url', publicUrl)
    setUploading(false)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    const { error: e } = await supabase.from('boats').update({
      name: form.name, model: form.model || null, type: form.type || null,
      year: form.year ? Number(form.year) : null,
      length_meters: form.length_meters ? Number(form.length_meters) : null,
      capacity: form.capacity ? Number(form.capacity) : null,
      cabins: form.cabins ? Number(form.cabins) : 0,
      status: form.status,
      hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
      half_day_rate: form.half_day_rate ? Number(form.half_day_rate) : null,
      full_day_rate: form.full_day_rate ? Number(form.full_day_rate) : null,
      weekly_rate: form.weekly_rate ? Number(form.weekly_rate) : null,
      deposit: form.deposit ? Number(form.deposit) : null,
      fuel_included: form.fuel_included, captain_required: form.captain_required,
      registration_number: form.registration_number || null,
      insurance_expiry: form.insurance_expiry || null,
      next_maintenance: form.next_maintenance || null,
      description: form.description || null, notes: form.notes || null,
      image_url: form.image_url || null, updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (e) { setError(e.message); setSaving(false); return }
    setBoatName(form.name)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const currentStatus = STATUSES.find(s => s.value === form.status)
  const tabs = [
    { id: 'info',          label: 'Información', icon: Info },
    { id: 'precios',       label: 'Precios',     icon: Tag },
    { id: 'mantenimiento', label: 'Mantenimiento', icon: Wrench },
  ] as const

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-900 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-gray-900 font-bold text-lg">{boatName || 'Barco'}</h1>
            <p className="text-gray-400 text-xs capitalize">{currentStatus?.label ?? form.status}</p>
          </div>
        </div>
        {activeTab === 'info' && (
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-[#C9A84C] hover:bg-[#E8C97A] disabled:opacity-60 text-black text-sm font-semibold rounded-lg transition-all">
            {saving ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              : saved ? <><CheckCircle size={15} /> Guardado</>
              : <><Save size={15} /> Guardar</>}
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === t.id ? 'bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30' : 'text-gray-400 hover:text-gray-900'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h2 className="text-gray-900 font-semibold text-sm">Información básica</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={labelCls}>Nombre *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Modelo</label>
                  <input value={form.model} onChange={e => set('model', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Tipo</label>
                  <select value={form.type} onChange={e => set('type', e.target.value)} className={inputCls}>
                    <option value="">Seleccionar...</option>
                    {BOAT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Año</label>
                  <input type="number" value={form.year} onChange={e => set('year', e.target.value)} placeholder="2023" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Matrícula</label>
                  <input value={form.registration_number} onChange={e => set('registration_number', e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h2 className="text-gray-900 font-semibold text-sm">Dimensiones y capacidad</h2>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Eslora (m)</label>
                  <input type="number" step="0.01" value={form.length_meters} onChange={e => set('length_meters', e.target.value)} placeholder="6.12" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Pasajeros máx.</label>
                  <input type="number" value={form.capacity} onChange={e => set('capacity', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Camarotes</label>
                  <input type="number" value={form.cabins} onChange={e => set('cabins', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.captain_required} onChange={e => set('captain_required', e.target.checked)} className="w-4 h-4 accent-[#C9A84C]" />
                  <span className="text-gray-400 text-sm">Requiere capitán</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.fuel_included} onChange={e => set('fuel_included', e.target.checked)} className="w-4 h-4 accent-[#C9A84C]" />
                  <span className="text-gray-400 text-sm">Combustible incluido</span>
                </label>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h2 className="text-gray-900 font-semibold text-sm">Tarifas base (€)</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Por hora', key: 'hourly_rate' },
                  { label: 'Medio día (4h)', key: 'half_day_rate' },
                  { label: 'Día completo (7h)', key: 'full_day_rate' },
                  { label: 'Semana', key: 'weekly_rate' },
                  { label: 'Fianza / Depósito', key: 'deposit' },
                ].map(f => (
                  <div key={f.key}>
                    <label className={labelCls}>{f.label}</label>
                    <input type="number" value={(form as any)[f.key]} onChange={e => set(f.key, e.target.value)} placeholder="0" className={inputCls} />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h2 className="text-gray-900 font-semibold text-sm">Documentación</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Vencimiento seguro</label>
                  <input type="date" value={form.insurance_expiry} onChange={e => set('insurance_expiry', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Próximo mantenimiento</label>
                  <input type="date" value={form.next_maintenance} onChange={e => set('next_maintenance', e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <h2 className="text-gray-900 font-semibold text-sm">Descripción y notas</h2>
              <div>
                <label className={labelCls}>Descripción pública</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className={inputCls + ' resize-none'} />
              </div>
              <div>
                <label className={labelCls}>Notas internas</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={inputCls + ' resize-none'} />
              </div>
            </div>
          </div>

          {/* Columna lateral */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <h2 className="text-gray-900 font-semibold text-sm flex items-center gap-2">
                <Camera size={15} className="text-[#C9A84C]" /> Foto del barco
              </h2>
              {form.image_url ? (
                <div className="relative">
                  <img src={form.image_url} alt={form.name} className="w-full h-44 object-cover rounded-lg" />
                  <button onClick={() => set('image_url', '')}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/70 hover:bg-red-500/80 text-gray-900 rounded-full flex items-center justify-center transition-colors">
                    <X size={13} />
                  </button>
                  <button onClick={() => fileRef.current?.click()}
                    className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-black/70 hover:bg-black text-gray-900 text-xs rounded-lg transition-colors">
                    <Upload size={11} /> Cambiar
                  </button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="w-full h-44 border-2 border-dashed border-gray-200 hover:border-[#C9A84C]/40 rounded-lg flex flex-col items-center justify-center gap-2 transition-colors group">
                  {uploading
                    ? <div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
                    : <>
                        <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-[#C9A84C]/10 flex items-center justify-center transition-colors">
                          <Upload size={18} className="text-gray-400 group-hover:text-[#C9A84C] transition-colors" />
                        </div>
                        <p className="text-gray-400 text-xs group-hover:text-gray-300">Subir foto</p>
                        <p className="text-gray-400 text-xs">JPG, PNG, WEBP · máx 5MB</p>
                      </>}
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) { if (file.size > 5 * 1024 * 1024) { setError('Máx 5MB'); return } handleUpload(file) }
                  e.target.value = ''
                }} />
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <h2 className="text-gray-900 font-semibold text-sm">Estado</h2>
              <div className="space-y-2">
                {STATUSES.map(s => (
                  <button key={s.value} onClick={() => set('status', s.value)}
                    className={`w-full py-2.5 rounded-lg text-sm font-medium border transition-all ${form.status === s.value ? s.color : 'border-gray-200 text-gray-400 hover:text-gray-300'}`}>
                    {form.status === s.value && <CheckCircle size={13} className="inline mr-1.5" />}
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'precios' && <PreciosTab boatId={id} />}
      {activeTab === 'mantenimiento' && <MantenimientoTab boatId={id} />}
    </div>
  )
}
