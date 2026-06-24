'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function NuevoClientePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('Nombre y apellidos son obligatorios')
      return
    }
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('clients').insert({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      nationality: form.nationality.trim() || null,
      id_number: form.id_number.trim() || null,
      boat_license: form.boat_license.trim() || null,
      is_vip: form.is_vip,
      notes: form.notes.trim() || null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    router.push('/clientes')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/clientes" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Nuevo cliente</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              value={form.first_name}
              onChange={e => set('first_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A84C]/50"
              placeholder="Juan"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
            <input
              value={form.last_name}
              onChange={e => set('last_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A84C]/50"
              placeholder="García López"
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
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A84C]/50"
              placeholder="juan@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A84C]/50"
              placeholder="+34 600 000 000"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nacionalidad</label>
            <input
              value={form.nationality}
              onChange={e => set('nationality', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A84C]/50"
              placeholder="Española"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">DNI / Pasaporte</label>
            <input
              value={form.id_number}
              onChange={e => set('id_number', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A84C]/50"
              placeholder="12345678A"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Licencia náutica</label>
          <input
            value={form.boat_license}
            onChange={e => set('boat_license', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A84C]/50"
            placeholder="PER-12345"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A84C]/50 resize-none"
            placeholder="Observaciones sobre el cliente..."
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => set('is_vip', !form.is_vip)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_vip ? 'bg-[#C9A84C]' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_vip ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className="text-sm font-medium text-gray-700">Cliente VIP</span>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/clientes" className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-[#C9A84C] hover:bg-[#E8C97A] text-black text-sm font-semibold rounded-lg disabled:opacity-50"
          >
            <Save size={15} /> {saving ? 'Guardando...' : 'Guardar cliente'}
          </button>
        </div>
      </form>
    </div>
  )
}
