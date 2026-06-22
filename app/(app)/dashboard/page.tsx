'use client'

import { useState, useEffect } from 'react'
import {
  Anchor, CalendarDays, Users, TrendingUp,
  Clock, CheckCircle, AlertCircle, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { getSession } from '@/lib/session'

const statusConfig = {
  active:    { label: 'Activa',      color: 'text-green-400 bg-green-400/10' },
  confirmed: { label: 'Confirmada',  color: 'text-blue-400 bg-blue-400/10' },
  pending:   { label: 'Pendiente',   color: 'text-yellow-400 bg-yellow-400/10' },
  cancelled: { label: 'Cancelada',   color: 'text-red-400 bg-red-400/10' },
  completed: { label: 'Completada',  color: 'text-gray-400 bg-gray-400/10' },
}

const boatStatusConfig = {
  available:   { label: 'Disponible',    dot: 'bg-green-400' },
  rented:      { label: 'Alquilado',     dot: 'bg-blue-400' },
  maintenance: { label: 'Mantenimiento', dot: 'bg-yellow-400' },
  inactive:    { label: 'Inactivo',      dot: 'bg-red-400' },
}

export default function DashboardPage() {
  const [loading, setLoading]       = useState(true)
  const [bookingsToday, setBookingsToday] = useState<any[]>([])
  const [boats, setBoats]           = useState<any[]>([])
  const [boatCounts, setBoatCounts] = useState({ available: 0, rented: 0, maintenance: 0, total: 0 })
  const [todayRevenue, setTodayRevenue]   = useState(0)
  const [todayFromBkgs, setTodayFromBkgs] = useState(0)
  const [maintenance, setMaintenance]     = useState<any[]>([])

  useEffect(() => { load() }, [])

  async function load() {
    const session  = getSession()
    const isSocio  = session?.role === 'socio'
    const boatIds  = session?.boatIds ?? []
    const hasLimit = isSocio && boatIds.length > 0

    const supabase = createClient()
    const todayStr = new Date().toISOString().slice(0, 10)

    // Bookings today
    let bkQuery = supabase
      .from('bookings')
      .select('*, client:clients(first_name,last_name), boat:boats(name,id)')
      .eq('start_date', todayStr)
    if (hasLimit) bkQuery = bkQuery.in('boat_id', boatIds)
    const { data: bkData } = await bkQuery
    setBookingsToday(bkData ?? [])

    // Today revenue from payments
    let payQuery = supabase.from('payments').select('amount').eq('payment_date', todayStr)
    if (hasLimit) payQuery = payQuery.in('booking_id',
      (bkData ?? []).map((b: any) => b.id)
    )
    const { data: payData } = await payQuery
    setTodayRevenue((payData ?? []).reduce((s: number, p: any) => s + (p.amount ?? 0), 0))
    setTodayFromBkgs((bkData ?? []).reduce((s: number, b: any) => s + (b.total_price ?? 0), 0))

    // Boats
    let boatsQuery = supabase.from('boats').select('*').order('name')
    if (hasLimit) boatsQuery = boatsQuery.in('id', boatIds)
    const { data: boatData } = await boatsQuery
    const allBoats = boatData ?? []
    setBoats(allBoats)
    setBoatCounts({
      available:   allBoats.filter((b: any) => b.status === 'available').length,
      rented:      allBoats.filter((b: any) => b.status === 'rented').length,
      maintenance: allBoats.filter((b: any) => b.status === 'maintenance').length,
      total:       allBoats.length,
    })

    // Maintenance (only show if not restricted, or filter to assigned boats)
    if (!isSocio) {
      const { data: mData } = await supabase.from('maintenance').select('*').eq('is_completed', false)
      setMaintenance(mData ?? [])
    }

    setLoading(false)
  }

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const totalPax = bookingsToday.reduce((s, b) => s + (b.adults ?? 0) + (b.children ?? 0), 0)

  const insuranceAlerts = boats.filter(b => {
    if (!b.insurance_expiry) return false
    return new Date(b.insurance_expiry) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
  })

  const kpis = [
    {
      label: 'Barcos disponibles',
      value: String(boatCounts.available),
      sub: `${boatCounts.rented} en uso · ${boatCounts.maintenance} en mantenimiento`,
      icon: Anchor, color: 'text-[#C9A84C]', bg: 'bg-[#C9A84C]/10',
    },
    {
      label: 'Reservas hoy',
      value: String(bookingsToday.length),
      sub: `${totalPax} pasajeros hoy`,
      icon: CalendarDays, color: 'text-blue-400', bg: 'bg-blue-400/10',
    },
    {
      label: 'Ingresos hoy',
      value: todayRevenue > 0
        ? `${todayRevenue.toLocaleString('es-ES')}€`
        : `${todayFromBkgs.toLocaleString('es-ES')}€`,
      sub: todayRevenue > 0 ? 'pagos recibidos' : 'valor reservas del día',
      icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10',
    },
    {
      label: 'Ocupación hoy',
      value: boatCounts.total > 0
        ? `${Math.round((boatCounts.rented / boatCounts.total) * 100)}%`
        : '0%',
      sub: `${boatCounts.rented} de ${boatCounts.total} barcos`,
      icon: Users, color: 'text-purple-400', bg: 'bg-purple-400/10',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Buenos días</h2>
        <p className="text-gray-400 text-sm mt-0.5 capitalize">{today}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((s) => (
          <div key={s.label} className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-xs font-medium">{s.label}</p>
                <p className="text-white text-2xl font-bold mt-1">{s.value}</p>
                <p className="text-gray-500 text-xs mt-0.5">{s.sub}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon size={18} className={s.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Reservas de hoy */}
        <div className="lg:col-span-3 bg-[#141414] border border-[#2A2A2A] rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
            <h3 className="text-white font-semibold text-sm">Reservas de Hoy</h3>
            <Link href="/reservas" className="text-[#C9A84C] text-xs hover:underline flex items-center gap-1">
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          {bookingsToday.length === 0 ? (
            <div className="text-center py-10 text-gray-600 text-sm">No hay reservas hoy</div>
          ) : (
            <div className="divide-y divide-[#1E1E1E]">
              {bookingsToday.map((b) => {
                const st = statusConfig[b.status as keyof typeof statusConfig]
                const clientName = b.client ? `${b.client.first_name} ${b.client.last_name}` : 'Sin cliente'
                return (
                  <div key={b.id} className="flex items-center justify-between px-5 py-3 hover:bg-[#1A1A1A] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center text-[#C9A84C] text-xs font-bold">
                        {clientName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{clientName}</p>
                        <p className="text-gray-500 text-xs">{b.boat?.name ?? '—'} · {b.adults ?? 1} pax</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                        <Clock size={11} /> {b.start_time?.slice(0, 5) ?? '—'}
                      </div>
                      {st && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Estado flota */}
        <div className="lg:col-span-2 bg-[#141414] border border-[#2A2A2A] rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
            <h3 className="text-white font-semibold text-sm">Estado Flota</h3>
            <Link href="/flota" className="text-[#C9A84C] text-xs hover:underline flex items-center gap-1">
              Ver flota <ArrowRight size={12} />
            </Link>
          </div>
          {boats.length === 0 ? (
            <div className="text-center py-10 text-gray-600 text-sm">No hay barcos</div>
          ) : (
            <div className="divide-y divide-[#1E1E1E]">
              {boats.slice(0, 6).map((boat) => {
                const st = boatStatusConfig[boat.status as keyof typeof boatStatusConfig]
                return (
                  <div key={boat.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-white text-sm font-medium">{boat.name}</p>
                      <p className="text-gray-500 text-xs">{boat.type ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${st?.dot ?? 'bg-gray-500'}`} />
                      <span className="text-gray-400 text-xs">{st?.label ?? boat.status}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Alertas */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
        <h3 className="text-white font-semibold text-sm mb-3">Alertas</h3>
        <div className="space-y-2">
          {insuranceAlerts.map(b => (
            <div key={b.id} className="flex items-center gap-3 text-sm">
              <AlertCircle size={16} className="text-yellow-400 flex-shrink-0" />
              <span className="text-gray-300">
                <strong className="text-white">{b.name}</strong> — Seguro vence el{' '}
                <strong className="text-white">
                  {new Date(b.insurance_expiry!).toLocaleDateString('es-ES')}
                </strong>
              </span>
            </div>
          ))}
          {maintenance.slice(0, 3).map(m => (
            <div key={m.id} className="flex items-center gap-3 text-sm">
              <AlertCircle size={16} className="text-yellow-400 flex-shrink-0" />
              <span className="text-gray-300">
                Mantenimiento pendiente: <strong className="text-white">{m.title}</strong>
              </span>
            </div>
          ))}
          {insuranceAlerts.length === 0 && maintenance.length === 0 && (
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
              <span className="text-gray-300">Todo en orden, sin alertas activas</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
