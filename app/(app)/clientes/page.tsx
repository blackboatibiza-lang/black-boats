'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Star, Phone, Mail, FileText, Users } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { getSession, hasEditPerm } from '@/lib/session'

export default function ClientesPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [vipOnly, setVipOnly] = useState(false)
  const [canEdit] = useState(() => hasEditPerm(getSession(), 'clientes'))

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('clients')
      .select('*, bookings(id, total_price)')
      .order('last_name')
      .then(({ data }) => {
        setClients(data ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = clients.filter(c => {
    const fullName = `${c.first_name} ${c.last_name}`.toLowerCase()
    const matchSearch =
      fullName.includes(search.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.nationality ?? '').toLowerCase().includes(search.toLowerCase())
    return matchSearch && (!vipOnly || c.is_vip)
  })

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVipOnly(false)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${!vipOnly ? 'bg-[#C9A84C] text-black border-[#C9A84C]' : 'bg-white text-gray-700 border-gray-200 hover:text-gray-900'}`}
          >
            Todos ({clients.length})
          </button>
          <button
            onClick={() => setVipOnly(true)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all flex items-center gap-1.5 ${vipOnly ? 'bg-[#C9A84C] text-black border-[#C9A84C]' : 'bg-white text-gray-700 border-gray-200 hover:text-gray-900'}`}
          >
            <Star size={13} /> VIP ({clients.filter(c => c.is_vip).length})
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar cliente..."
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C9A84C]/50 w-52"
            />
          </div>
          {canEdit && (
            <Link
              href="/clientes/nuevo"
              className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] hover:bg-[#E8C97A] text-black text-sm font-semibold rounded-lg transition-colors"
            >
              <Plus size={16} /> Nuevo cliente
            </Link>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-xl">
          <Users size={36} className="mx-auto mb-3 text-gray-700" />
          <p className="text-gray-700">No hay clientes todavía</p>
          {canEdit && (
            <Link href="/clientes/nuevo" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#C9A84C] text-black text-sm font-semibold rounded-lg">
              <Plus size={15} /> Añadir primer cliente
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(client => {
            const totalSpent = (client.bookings ?? []).reduce((s: number, b: any) => s + Number(b.total_price || 0), 0)
            return (
              <Link
                key={client.id}
                href={`/clientes/${client.id}`}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#C9A84C]/30 hover:bg-[#171717] transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center text-[#C9A84C] font-bold text-base">
                      {client.first_name[0]}{client.last_name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-gray-900 font-semibold">{client.first_name} {client.last_name}</p>
                        {client.is_vip && <Star size={13} className="text-[#C9A84C] fill-[#C9A84C]" />}
                      </div>
                      <p className="text-gray-700 text-xs">{client.nationality ?? '—'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5 mb-4">
                  {client.email && (
                    <div className="flex items-center gap-2 text-gray-700 text-xs">
                      <Mail size={12} /> <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-gray-700 text-xs">
                      <Phone size={12} /> {client.phone}
                    </div>
                  )}
                  {client.boat_license && (
                    <div className="flex items-center gap-2 text-gray-700 text-xs">
                      <FileText size={12} /> Licencia: {client.boat_license}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-200">
                  <div>
                    <p className="text-gray-900 text-base font-bold">{(client.bookings ?? []).length}</p>
                    <p className="text-gray-700 text-xs">Reservas</p>
                  </div>
                  <div>
                    <p className="text-[#C9A84C] text-base font-bold">{totalSpent.toLocaleString('es-ES')}€</p>
                    <p className="text-gray-700 text-xs">Total gastado</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
