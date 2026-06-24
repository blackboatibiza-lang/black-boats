'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, Star, Phone, Mail, FileText, Calendar, Pencil } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [bookings, setBookings] = useState<any[]>([])

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    nationality: '',
    id_number: '',
    boat_license: '',
    is_vip: false,
    notes: '',
  })

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }))

  useEffect(() => {
    async function load() {
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single()
      if (!client) { router.push('/clientes'); return }
      setForm({
        first_name: client.first_name ?? '',
        last_name: client.last_name ?? '',
        email: client.email ?? '',
        phone: client.phone ?? '',
        nationality: client.nationality ?? '',
        id_number: client.id_number ?? '',
        boat_license: client.boat_license ?? '',
        is_vip: client.is_vip ?? false,
        notes: client.notes ?? '',
      })

      const { data: bks } = await supabase
        .from('bookings')
        .select('id, start_date, end_date, total_price, status, boat:boats(name)')
        .eq('client_id', id)
        .order('start_date', { ascending: false })
      setBookings(bks ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('Nombre y apellidos son obligatorios')
      return
    }
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('clients').update({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      nationality: form.nationality.trim() || null,
      id_number: form.id_number.trim() || null,
      boat_license: form.boat_license.trim() || null,
      is_vip: form.is_vip,
      notes: form.notes.trim() || null,
    }).eq('id', id)
    setSaving(false)
    if (err) { setError(err.message); return }
    setEditing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const totalSpent = bookings.reduce((s, b) => s + Number(b.total_price || 0), 0)

  const STATUS_LABEL: Record<string, string> = {
    confirmed: 'Confirmada',
    pending: 'Pendiente',
    cancelled: 'Cancelada',
    completed: 'Completada',
  }
  const STATUS_COLOR: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/clientes" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{form.first_name} {form.last_name}</h1>
            {form.is_vip && <Star size={15} className="text-[#C9A84C] fill-[#C9A84C]" />}
          </div>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] hover:bg-[#E8C97A] text-black text-sm font-semibold rounded-lg"
          >
            <Pencil size={14} /> Editar
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
          <p className="text-sm text-gray-500">Reservas totales</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-[#C9A84C]">{totalSpent.toLocaleString('es-ES')}€</p>
          <p className="text-sm text-gray-500">Total gastado</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">Datos personales</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              value={form.first_name}
              onChange={e => set('first_name', e.target.value)}
              disabled={!editing}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A84C]/50 disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
            <input
              value={form.last_name}
              onChange={e => set('last_name', e.target.value)}
              disabled={!editing}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A84C]/50 disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              disabled={!editing}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A84C]/50 disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              disabled={!editing}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A84C]/50 disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nacionalidad</label>
            <input
              value={form.nationality}
              onChange={e => set('nationality', e.target.value)}
              disabled={!editing}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A84C]/50 disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">DNI / Pasaporte</label>
            <input
              value={form.id_number}
              onChange={e => set('id_number', e.target.value)}
              disabled={!editing}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A84C]/50 disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Licencia náutica</label>
          <input
            value={form.boat_license}
            onChange={e => set('boat_license', e.target.value)}
            disabled={!editing}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A84C]/50 disabled:bg-gray-50 disabled:text-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            disabled={!editing}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A84C]/50 disabled:bg-gray-50 disabled:text-gray-600 resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => editing && set('is_vip', !form.is_vip)}
            disabled={!editing}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_vip ? 'bg-[#C9A84C]' : 'bg-gray-200'} disabled:opacity-60`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_vip ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className="text-sm font-medium text-gray-700">Cliente VIP</span>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {editing && (
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-[#C9A84C] hover:bg-[#E8C97A] text-black text-sm font-semibold rounded-lg disabled:opacity-50"
            >
              <Save size={15} /> {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </form>

      {/* Bookings history */}
      {bookings.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Historial de reservas</h2>
          <div className="space-y-2">
            {bookings.map(b => (
              <Link
                key={b.id}
                href={`/reservas/${b.id}`}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-[#C9A84C]/30 hover:bg-gray-50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Calendar size={14} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{b.boat?.name ?? '—'}</p>
                    <p className="text-xs text-gray-500">
                      {b.start_date ? new Date(b.start_date).toLocaleDateString('es-ES') : '—'}
                      {b.end_date && b.end_date !== b.start_date ? ` → ${new Date(b.end_date).toLocaleDateString('es-ES')}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[b.status] ?? b.status}
                  </span>
                  <span className="text-sm font-semibold text-[#C9A84C]">{Number(b.total_price || 0).toLocaleString('es-ES')}€</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
