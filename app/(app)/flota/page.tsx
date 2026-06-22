'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Anchor, Wrench, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { getSession, hasEditPerm } from '@/lib/session'
import type { Boat, BoatStatus } from '@/types'

const statusConfig: Record<BoatStatus, { label: string; color: string; dot: string }> = {
  available:   { label: 'Disponible',    color: 'text-green-400 bg-green-400/10 border-green-400/20',  dot: 'bg-green-400' },
  rented:      { label: 'Alquilado',     color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',    dot: 'bg-blue-400' },
  maintenance: { label: 'Mantenimiento', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', dot: 'bg-yellow-400' },
  inactive:    { label: 'Inactivo',      color: 'text-red-400 bg-red-400/10 border-red-400/20',       dot: 'bg-red-400' },
}

export default function FlotaPage() {
  const [boats, setBoats] = useState<Boat[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<BoatStatus | 'all'>('all')
  const [canEdit, setCanEdit] = useState(false)

  useEffect(() => {
    const session  = getSession()
    const isSocio  = session?.role === 'socio'
    const boatIds  = session?.boatIds ?? []
    const hasLimit = isSocio && boatIds.length > 0
    setCanEdit(hasEditPerm(session, 'flota'))

    const supabase = createClient()
    let q = supabase.from('boats').select('*').order('name')
    if (hasLimit) q = q.in('id', boatIds)
    q.then(({ data }) => {
      setBoats(data ?? [])
      setLoading(false)
    })
  }, [])

  const filtered = boats.filter(b => {
    const matchSearch = b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.type ?? '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || b.status === filter
    return matchSearch && matchFilter
  })

  const counts = {
    all: boats.length,
    available: boats.filter(b => b.status === 'available').length,
    rented: boats.filter(b => b.status === 'rented').length,
    maintenance: boats.filter(b => b.status === 'maintenance').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'available', 'rented', 'maintenance'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                filter === f
                  ? 'bg-[#C9A84C] text-black border-[#C9A84C]'
                  : 'bg-[#141414] text-gray-400 border-[#2A2A2A] hover:text-white'
              }`}
            >
              {f === 'all' ? 'Todos' : statusConfig[f].label} ({counts[f] ?? 0})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar barco..."
              className="pl-9 pr-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A84C]/50 w-52"
            />
          </div>
          {canEdit && (
            <Link
              href="/flota/nuevo"
              className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] hover:bg-[#E8C97A] text-black text-sm font-semibold rounded-lg transition-colors"
            >
              <Plus size={16} /> Añadir barco
            </Link>
          )}
        </div>
      </div>

      {filtered.length === 0 && !loading && (
        <div className="text-center py-20 bg-[#141414] border border-[#2A2A2A] rounded-xl">
          <Anchor size={36} className="mx-auto mb-3 text-gray-700" />
          <p className="text-gray-500">No hay barcos todavía</p>
          {canEdit && (
            <Link href="/flota/nuevo" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#C9A84C] text-black text-sm font-semibold rounded-lg">
              <Plus size={15} /> Añadir primer barco
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(boat => {
          const st = statusConfig[boat.status]
          const insuranceSoon = boat.insurance_expiry &&
            new Date(boat.insurance_expiry) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
          return (
            <Link
              key={boat.id}
              href={`/flota/${boat.id}`}
              className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5 hover:border-[#C9A84C]/30 hover:bg-[#171717] transition-all group"
            >
              <div className="w-full h-36 bg-[#1E1E1E] rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                {boat.image_url
                  ? <img src={boat.image_url} alt={boat.name} className="w-full h-full object-cover rounded-lg" />
                  : <Anchor size={32} className="text-[#2A2A2A] group-hover:text-[#C9A84C]/20 transition-colors" />
                }
              </div>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold">{boat.name}</h3>
                  <p className="text-gray-500 text-sm">{boat.model ?? boat.type ?? '—'}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border font-medium ${st.color}`}>{st.label}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                <div className="bg-[#1E1E1E] rounded-lg py-2">
                  <p className="text-white text-sm font-semibold">{boat.length_meters ? `${boat.length_meters}m` : '—'}</p>
                  <p className="text-gray-500 text-xs">Eslora</p>
                </div>
                <div className="bg-[#1E1E1E] rounded-lg py-2">
                  <p className="text-white text-sm font-semibold">{boat.capacity ?? '—'}</p>
                  <p className="text-gray-500 text-xs">Pax</p>
                </div>
                <div className="bg-[#1E1E1E] rounded-lg py-2">
                  <p className="text-[#C9A84C] text-sm font-semibold">
                    {boat.full_day_rate ? `${Number(boat.full_day_rate).toLocaleString()}€` : '—'}
                  </p>
                  <p className="text-gray-500 text-xs">Día</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{boat.type ?? ''}{boat.captain_required ? ' · Capitán requerido' : ''}</span>
                {insuranceSoon && (
                  <span className="flex items-center gap-1 text-yellow-400">
                    <AlertCircle size={11} /> Seguro pronto
                  </span>
                )}
                {boat.next_maintenance && !insuranceSoon && (
                  <span className="flex items-center gap-1 text-yellow-400">
                    <Wrench size={11} /> Revisión pdte.
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
