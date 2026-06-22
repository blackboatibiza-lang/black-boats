'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Save, Upload, Camera, AlertCircle, X } from 'lucide-react'
import type { BoatStatus } from '@/types'

const BOAT_TYPES = ['Lancha', 'Lancha grande', 'Catamarán', 'Velero', 'RIB', 'Moto de agua', 'Sin licencia', 'Motor', 'Otro']

export default function NuevoBarcoPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const [form, setForm] = useState({
    name: '', model: '', type: '', year: '',
    length_meters: '', capacity: '', cabins: '',
    status: 'available' as BoatStatus,
    hourly_rate: '', half_day_rate: '', full_day_rate: '', weekly_rate: '', deposit: '',
    fuel_included: false, captain_required: false,
    registration_number: '', insurance_expiry: '', next_maintenance: '',
    description: '', notes: '',
  })
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  function handleFileSelect(file: File) {
    if (file.size > 5 * 1024 * 1024) { setError('La imagen no puede superar 5MB'); return }
    setPendingFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError('')
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true)
    setError('')
    const supabase = createClient()

    let image_url: string | null = null

    // Si hay imagen pendiente, la subimos primero con un ID temporal
    if (pendingFile) {
      setUploading(true)
      const tempId = crypto.randomUUID()
      const ext = pendingFile.name.split('.').pop()
      const path = `${tempId}/main.${ext}`
      const { error: upErr } = await supabase.storage
        .from('boat-images')
        .upload(path, pendingFile, { contentType: pendingFile.type })
      if (upErr) {
        setError('Error al subir imagen: ' + upErr.message)
        setSaving(false)
        setUploading(false)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('boat-images').getPublicUrl(path)
      image_url = publicUrl
      setUploading(false)
    }

    const { data, error: e } = await supabase.from('boats').insert({
      name: form.name,
      model: form.model || null,
      type: form.type || null,
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
      fuel_included: form.fuel_included,
      captain_required: form.captain_required,
      registration_number: form.registration_number || null,
      insurance_expiry: form.insurance_expiry || null,
      next_maintenance: form.next_maintenance || null,
      description: form.description || null,
      notes: form.notes || null,
      image_url,
    }).select().single()

    if (e) { setError(e.message); setSaving(false); return }
    router.push(`/flota/${data.id}`)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-900 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-gray-900 font-bold text-lg">Nuevo barco</h1>
            <p className="text-gray-400 text-xs">Añadir embarcación a la flota</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-[#C9A84C] hover:bg-[#E8C97A] disabled:opacity-60 text-black text-sm font-semibold rounded-lg transition-all">
          {saving
            ? <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />{uploading ? 'Subiendo...' : 'Guardando...'}</>
            : <><Save size={15} /> Guardar barco</>
          }
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">

          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="text-gray-900 font-semibold text-sm">Información básica</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-gray-400 text-xs mb-1.5 block">Nombre *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ej: Quicksilver 605"
                  className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C9A84C]/50" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Modelo</label>
                <input value={form.model} onChange={e => set('model', e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/50" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Tipo</label>
                <select value={form.type} onChange={e => set('type', e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/50">
                  <option value="">Seleccionar...</option>
                  {BOAT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Año</label>
                <input type="number" value={form.year} onChange={e => set('year', e.target.value)} placeholder="2024"
                  className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C9A84C]/50" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Matrícula</label>
                <input value={form.registration_number} onChange={e => set('registration_number', e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/50" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="text-gray-900 font-semibold text-sm">Dimensiones y capacidad</h2>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Eslora (m)</label>
                <input type="number" step="0.01" value={form.length_meters} onChange={e => set('length_meters', e.target.value)} placeholder="6.12"
                  className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C9A84C]/50" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Pasajeros máx.</label>
                <input type="number" value={form.capacity} onChange={e => set('capacity', e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/50" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Camarotes</label>
                <input type="number" value={form.cabins} onChange={e => set('cabins', e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/50" />
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
            <h2 className="text-gray-900 font-semibold text-sm">Tarifas (€)</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'hourly_rate', label: 'Por hora' },
                { key: 'half_day_rate', label: 'Medio día (4h)' },
                { key: 'full_day_rate', label: 'Día completo (7h)' },
                { key: 'weekly_rate', label: 'Semana' },
                { key: 'deposit', label: 'Fianza / Depósito' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-gray-400 text-xs mb-1.5 block">{f.label}</label>
                  <input type="number" value={(form as any)[f.key]} onChange={e => set(f.key, e.target.value)} placeholder="0"
                    className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C9A84C]/50" />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="text-gray-900 font-semibold text-sm">Documentación</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Vencimiento seguro</label>
                <input type="date" value={form.insurance_expiry} onChange={e => set('insurance_expiry', e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/50" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Próximo mantenimiento</label>
                <input type="date" value={form.next_maintenance} onChange={e => set('next_maintenance', e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/50" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <h2 className="text-gray-900 font-semibold text-sm">Descripción y notas</h2>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Descripción pública</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
                className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/50 resize-none" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Notas internas</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/50 resize-none" />
            </div>
          </div>
        </div>

        {/* Lateral */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <h2 className="text-gray-900 font-semibold text-sm flex items-center gap-2">
              <Camera size={15} className="text-[#C9A84C]" /> Foto del barco
            </h2>
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full h-44 object-cover rounded-lg" />
                <button onClick={() => { setImagePreview(''); setPendingFile(null) }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/70 hover:bg-red-500/80 text-gray-900 rounded-full flex items-center justify-center transition-colors">
                  <X size={13} />
                </button>
                <button onClick={() => fileRef.current?.click()}
                  className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-black/70 hover:bg-black text-gray-900 text-xs rounded-lg transition-colors">
                  <Upload size={11} /> Cambiar
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                className="w-full h-44 border-2 border-dashed border-gray-200 hover:border-[#C9A84C]/40 rounded-lg flex flex-col items-center justify-center gap-2 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-[#C9A84C]/10 flex items-center justify-center transition-colors">
                  <Upload size={18} className="text-gray-400 group-hover:text-[#C9A84C] transition-colors" />
                </div>
                <p className="text-gray-400 text-xs group-hover:text-gray-300 transition-colors">Subir foto</p>
                <p className="text-gray-400 text-xs">JPG, PNG, WEBP · máx 5MB</p>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = '' }} />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
            <h2 className="text-gray-900 font-semibold text-sm mb-3">Estado inicial</h2>
            {[
              { value: 'available', label: 'Disponible', color: 'text-green-400 border-green-400/40 bg-green-400/10' },
              { value: 'inactive',  label: 'Inactivo',   color: 'text-gray-400 border-gray-400/40 bg-gray-400/10' },
            ].map(s => (
              <button key={s.value} onClick={() => set('status', s.value)}
                className={`w-full py-2.5 rounded-lg text-sm font-medium border transition-all ${form.status === s.value ? s.color : 'border-gray-200 text-gray-400 hover:text-gray-300'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
