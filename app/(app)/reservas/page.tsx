'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, CalendarDays, Clock, Anchor, Users, List, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { getSession, hasEditPerm } from '@/lib/session'
import type { BookingStatus } from '@/types'

const STATUS: Record<BookingStatus, { label: string; color: string; dot: string; bg: string }> = {
  pending:   { label: 'Pendiente',  color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', dot: 'bg-yellow-400', bg: 'bg-yellow-400/20 border-yellow-400/40' },
  confirmed: { label: 'Confirmada', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',       dot: 'bg-blue-400',   bg: 'bg-blue-400/20 border-blue-400/40' },
  active:    { label: 'Activa',     color: 'text-green-400 bg-green-400/10 border-green-400/20',    dot: 'bg-green-400',  bg: 'bg-green-400/20 border-green-400/40' },
  completed: { label: 'Completada', color: 'text-gray-700 bg-gray-400/10 border-gray-400/20',       dot: 'bg-gray-400',   bg: 'bg-gray-400/20 border-gray-400/30' },
  cancelled: { label: 'Cancelada',  color: 'text-red-400 bg-red-400/10 border-red-400/20',          dot: 'bg-red-400',    bg: 'bg-red-400/20 border-red-400/40' },
}

const PAY: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Sin pagar', color: 'text-red-400' },
  partial:  { label: 'Parcial',   color: 'text-yellow-400' },
  paid:     { label: 'Pagado',    color: 'text-green-400' },
  refunded: { label: 'Devuelto',  color: 'text-gray-700' },
}

type BoatColor = { bg: string; dot: string; text: string }

// Colores fijos por nombre de barco (match insensible a mayúsculas/tildes)
const BOAT_NAME_COLORS: { match: string; color: BoatColor }[] = [
  { match: 'sessa',       color: { bg: 'bg-yellow-300/25 border-yellow-300/50',   dot: 'bg-yellow-300',   text: 'text-yellow-300'   } }, // amarillo
  { match: 'joel',        color: { bg: 'bg-cyan-300/25 border-cyan-300/50',       dot: 'bg-cyan-300',     text: 'text-cyan-300'     } }, // verde turquesa claro
  { match: 'cattleya',    color: { bg: 'bg-zinc-400/20 border-zinc-400/40',       dot: 'bg-zinc-300',     text: 'text-zinc-300'     } }, // negro/gris claro
  { match: 'quick',       color: { bg: 'bg-emerald-300/20 border-emerald-300/40', dot: 'bg-emerald-300',  text: 'text-emerald-300'  } }, // verde menta
  { match: 'arendel',     color: { bg: 'bg-violet-400/20 border-violet-400/40',   dot: 'bg-violet-400',   text: 'text-violet-400'   } }, // lila
  { match: 'moto',        color: { bg: 'bg-pink-400/20 border-pink-400/40',       dot: 'bg-pink-400',     text: 'text-pink-400'     } }, // rosa chicle
  { match: 'maretti',     color: { bg: 'bg-green-400/20 border-green-400/40',     dot: 'bg-green-400',    text: 'text-green-400'    } }, // verde manzana
]

const BOAT_PALETTE_FALLBACK: BoatColor[] = [
  { bg: 'bg-[#C9A84C]/25 border-[#C9A84C]/50', dot: 'bg-[#C9A84C]', text: 'text-[#C9A84C]' },
  { bg: 'bg-sky-400/20 border-sky-400/40',      dot: 'bg-sky-400',   text: 'text-sky-400'   },
  { bg: 'bg-orange-400/20 border-orange-400/40',dot: 'bg-orange-400',text: 'text-orange-400'},
  { bg: 'bg-teal-400/20 border-teal-400/40',    dot: 'bg-teal-400',  text: 'text-teal-400'  },
]

const BOAT_PALETTE = BOAT_NAME_COLORS.map(x => x.color) // keep type compat

function getBoatColor(name: string, fallbackIndex: number): BoatColor {
  const n = (name ?? '').toLowerCase()
  const found = BOAT_NAME_COLORS.find(x => n.includes(x.match))
  return found ? found.color : BOAT_PALETTE_FALLBACK[fallbackIndex % BOAT_PALETTE_FALLBACK.length]
}

function buildBoatColorMap(boats: any[]): Record<string, BoatColor> {
  const map: Record<string, BoatColor> = {}
  boats.forEach((b, i) => { map[b.id] = getBoatColor(b.name, i) })
  return map
}

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_ES   = ['L','M','X','J','V','S','D']

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function inRange(d: Date, start: string, end: string) {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end   + 'T00:00:00')
  return d >= s && d <= e
}

// ── CALENDAR VIEW ────────────────────────────────────────────────
function CalendarView({ bookings, filter, boatColors, boats, canEdit }: { bookings: any[]; filter: BookingStatus | 'all'; boatColors: Record<string, typeof BOAT_PALETTE[0]>; boats: any[]; canEdit: boolean }) {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<Date | null>(null)

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  // Build grid: Mon-first weeks
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  // Monday-first offset
  const startOffset = (firstDay.getDay() + 6) % 7
  const totalCells  = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7
  const cells: (Date | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const d = i - startOffset + 1
    return d >= 1 && d <= lastDay.getDate() ? new Date(year, month, d) : null
  })

  const visibleBookings = bookings.filter(b =>
    filter === 'all' ? b.status !== 'cancelled' : b.status === filter
  )

  function bookingsForDay(d: Date) {
    return visibleBookings.filter(b => inRange(d, b.start_date, b.end_date))
  }

  const selectedBookings = selected ? bookingsForDay(selected) : []

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:text-gray-900 hover:border-[#C9A84C]/30 transition-all">
            <ChevronLeft size={16} />
          </button>
          <div className="text-center">
            <p className="text-gray-900 font-semibold">{MONTHS_ES[month]} {year}</p>
            <p className="text-gray-700 text-xs">{visibleBookings.filter(b => {
              const s = new Date(b.start_date + 'T00:00:00')
              return s.getFullYear() === year && s.getMonth() === month
            }).length} reservas este mes</p>
          </div>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:text-gray-900 hover:border-[#C9A84C]/30 transition-all">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAYS_ES.map(d => (
            <div key={d} className={`text-center py-2.5 text-xs font-medium ${d === 'S' || d === 'D' ? 'text-[#C9A84C]/60' : 'text-gray-700'}`}>{d}</div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) return <div key={i} className="h-14 sm:h-20 border-b border-r border-gray-100 last:border-r-0" />
            const dayBookings = bookingsForDay(day)
            const isToday = isSameDay(day, today)
            const isSelected = selected && isSameDay(day, selected)
            const isWeekend = day.getDay() === 0 || day.getDay() === 6
            return (
              <button
                key={i}
                onClick={() => setSelected(isSelected ? null : day)}
                className={`h-14 sm:h-20 p-1 sm:p-1.5 border-b border-r border-gray-100 last:border-r-0 text-left transition-colors relative
                  ${isSelected ? 'bg-[#C9A84C]/10' : 'hover:bg-gray-50'}
                  ${isWeekend ? 'bg-gray-50' : ''}`}
              >
                <span className={`text-xs font-medium block mb-1 w-6 h-6 flex items-center justify-center rounded-full
                  ${isToday ? 'bg-[#C9A84C] text-black font-bold' : isWeekend ? 'text-[#C9A84C]/50' : 'text-gray-700'}`}>
                  {day.getDate()}
                </span>
                <div className="space-y-0.5">
                  {dayBookings.slice(0, 2).map(b => {
                    const c = boatColors[b.boat_id] ?? BOAT_PALETTE[0]
                    return (
                      <div key={b.id} className={`text-[10px] px-1.5 py-0.5 rounded border truncate leading-tight ${c.bg}`}>
                        <span className={`${c.text} font-semibold`}>
                          {b.boat?.name?.split(' ')[0] ?? '—'}
                        </span>
                      </div>
                    )
                  })}
                  {dayBookings.length > 2 && (
                    <p className="text-[10px] text-gray-700 px-1">+{dayBookings.length - 2} más</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend — colores por barco */}
      <div className="flex items-center gap-3 flex-wrap">
        {boats.map(b => {
          const c = boatColors[b.id] ?? BOAT_PALETTE[0]
          return (
            <div key={b.id} className="flex items-center gap-1.5 text-xs text-gray-700">
              <div className={`w-2.5 h-2.5 rounded-sm ${c.dot}`} />
              {b.name}
            </div>
          )
        })}
      </div>

      {/* Selected day panel */}
      {selected && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-200">
            <p className="text-gray-900 font-semibold text-sm">
              {selected.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <p className="text-gray-700 text-xs">{selectedBookings.length} reserva{selectedBookings.length !== 1 ? 's' : ''}</p>
          </div>
          {selectedBookings.length === 0 ? (
            <div className="text-center py-8 text-gray-700 text-sm">Sin reservas este día</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {selectedBookings.map(b => {
                const st = STATUS[b.status as BookingStatus]
                const c  = boatColors[b.boat_id] ?? BOAT_PALETTE[0]
                const clientName = b.client ? `${b.client.first_name} ${b.client.last_name}` : 'Sin cliente'
                const inner = (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-8 rounded-sm flex-shrink-0 ${c.dot}`} />
                      <div>
                        <p className="text-gray-900 text-sm font-medium">{canEdit ? clientName : '— Restringido —'}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-700 mt-0.5">
                          <span className="flex items-center gap-1"><Anchor size={10} />{b.boat?.name ?? '—'}</span>
                          <span className="flex items-center gap-1"><Clock size={10} />{b.start_time?.slice(0,5) ?? '—'} → {b.end_time?.slice(0,5) ?? '—'}</span>
                          {canEdit && <span className="flex items-center gap-1"><Users size={10} />{b.adults ?? 1} pax</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-900 font-semibold text-sm">{Number(b.total_price).toLocaleString('es-ES')}€</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${st?.color ?? ''}`}>{st?.label}</span>
                    </div>
                  </div>
                )
                return canEdit
                  ? <Link key={b.id} href={`/reservas/${b.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">{inner}</Link>
                  : <div key={b.id} className="flex items-center justify-between px-5 py-3">{inner}</div>
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── LIST VIEW ────────────────────────────────────────────────────
function ListView({ bookings, canEdit, onDelete }: { bookings: any[]; canEdit: boolean; onDelete: (id: string) => void }) {
  if (bookings.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="text-center py-16 text-gray-700">
          <CalendarDays size={32} className="mx-auto mb-3 text-gray-700" />
          <p>No hay reservas</p>
          {canEdit && (
            <Link href="/reservas/nueva" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#C9A84C] text-black text-sm font-semibold rounded-lg">
              <Plus size={15} /> Nueva reserva
            </Link>
          )}
        </div>
      </div>
    )
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-5 py-3.5 text-gray-700 font-medium text-xs">N° Reserva</th>
              <th className="text-left px-5 py-3.5 text-gray-700 font-medium text-xs">Cliente</th>
              <th className="text-left px-5 py-3.5 text-gray-700 font-medium text-xs">Barco</th>
              <th className="text-left px-5 py-3.5 text-gray-700 font-medium text-xs">Fecha</th>
              <th className="text-left px-5 py-3.5 text-gray-700 font-medium text-xs">Pax</th>
              <th className="text-left px-5 py-3.5 text-gray-700 font-medium text-xs">Total</th>
              <th className="text-left px-5 py-3.5 text-gray-700 font-medium text-xs">Pago</th>
              <th className="text-left px-5 py-3.5 text-gray-700 font-medium text-xs">Estado</th>
              {canEdit && <th className="px-5 py-3.5" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bookings.map(b => {
              const st = STATUS[b.status as BookingStatus]
              const pay = PAY[b.payment_status as keyof typeof PAY]
              const clientName = b.client ? `${b.client.first_name} ${b.client.last_name}` : 'Sin cliente'
              const isMultiDay = b.start_date !== b.end_date
              return (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    {canEdit
                      ? <Link href={`/reservas/${b.id}`} className="text-[#C9A84C] hover:underline font-mono text-xs">{b.booking_number}</Link>
                      : <span className="text-gray-700 font-mono text-xs">{b.booking_number}</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[#C9A84C] text-xs font-bold flex-shrink-0">
                        {clientName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <span className="text-gray-900 font-medium">{clientName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-gray-700">
                      <Anchor size={13} className="text-gray-700 flex-shrink-0" />
                      {b.boat?.name ?? '—'}
                    </div>
                    <span className="text-xs text-gray-700">
                      {b.rental_type === 'with_captain' ? 'Con capitán' : 'Sin capitán'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-gray-700">
                      <CalendarDays size={13} className="text-gray-700" />
                      {new Date(b.start_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      {isMultiDay && ` → ${new Date(b.end_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-700">
                      <Clock size={11} /> {b.start_time?.slice(0, 5) ?? '—'}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 text-gray-700">
                      <Users size={13} className="text-gray-700" /> {b.adults ?? 1}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-gray-900 font-semibold">{Number(b.total_price).toLocaleString('es-ES')}€</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium ${pay?.color ?? 'text-gray-700'}`}>{pay?.label ?? b.payment_status}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${st?.color ?? ''}`}>{st?.label ?? b.status}</span>
                  </td>
                  {canEdit && (
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar reserva ${b.booking_number}? Esta acción no se puede deshacer.`)) {
                            onDelete(b.id)
                          }
                        }}
                        className="text-gray-700 hover:text-red-400 transition-colors"
                        title="Eliminar reserva">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── PAGE ─────────────────────────────────────────────────────────
export default function ReservasPage() {
  const [bookings, setBookings]   = useState<any[]>([])
  const [boats, setBoats]         = useState<any[]>([])
  const [boatColors, setBoatColors] = useState<Record<string, typeof BOAT_PALETTE[0]>>({})
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState<BookingStatus | 'all'>('all')
  const [view, setView]           = useState<'list' | 'calendar'>('list')
  const [canEdit, setCanEdit]     = useState(false)

  useEffect(() => {
    const session  = getSession()
    setCanEdit(hasEditPerm(session, 'reservas'))
    const isSocio  = session?.role === 'socio'
    const boatIds  = session?.boatIds ?? []
    const hasLimit = isSocio && boatIds.length > 0

    const supabase = createClient()
    let bkQuery = supabase
      .from('bookings')
      .select('*, client:clients(first_name,last_name), boat:boats(name,id), calendar_event_id')
      .order('start_date', { ascending: false })
    if (hasLimit) bkQuery = bkQuery.in('boat_id', boatIds)

    let boatsQuery = supabase.from('boats').select('id,name').order('name')
    if (hasLimit) boatsQuery = boatsQuery.in('id', boatIds)

    Promise.all([bkQuery, boatsQuery]).then(([{ data: bkData }, { data: boatData }]) => {
      const boatList = boatData ?? []
      setBookings(bkData ?? [])
      setBoats(boatList)
      setBoatColors(buildBoatColorMap(boatList))
      setLoading(false)
    })
  }, [])

  async function handleDelete(id: string) {
    const supabase = createClient()
    // Delete Google Calendar event if exists
    const booking = bookings.find(b => b.id === id)
    if (booking?.calendar_event_id) {
      fetch('/api/calendar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: booking.calendar_event_id }),
      }).catch(() => {})
    }
    await supabase.from('bookings').delete().eq('id', id)
    setBookings(prev => prev.filter(b => b.id !== id))
  }

  const filtered = bookings.filter(b => {
    const clientName = b.client ? `${b.client.first_name} ${b.client.last_name}` : ''
    const matchSearch =
      clientName.toLowerCase().includes(search.toLowerCase()) ||
      (b.boat?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      b.booking_number.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || b.status === filter
    return matchSearch && matchFilter
  })

  const counts = {
    all: bookings.length,
    active: bookings.filter(b => b.status === 'active').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    pending: bookings.filter(b => b.status === 'pending').length,
    completed: bookings.filter(b => b.status === 'completed').length,
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
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'active', 'confirmed', 'pending', 'completed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                filter === f
                  ? 'bg-[#C9A84C] text-black border-[#C9A84C]'
                  : 'bg-white text-gray-700 border-gray-200 hover:text-gray-900'
              }`}>
              {f === 'all' ? `Todas (${counts.all})` : `${STATUS[f].label} (${counts[f] ?? 0})`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {/* Search — hidden in calendar */}
          {view === 'list' && (
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar reserva..."
                className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C9A84C]/50 w-44" />
            </div>
          )}
          {/* View toggle */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button onClick={() => setView('list')}
              className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors ${view === 'list' ? 'bg-[#C9A84C]/10 text-[#C9A84C]' : 'text-gray-700 hover:text-gray-900'}`}>
              <List size={15} />
            </button>
            <button onClick={() => setView('calendar')}
              className={`px-3 py-2 flex items-center gap-1.5 text-sm border-l border-gray-200 transition-colors ${view === 'calendar' ? 'bg-[#C9A84C]/10 text-[#C9A84C]' : 'text-gray-700 hover:text-gray-900'}`}>
              <CalendarDays size={15} />
            </button>
          </div>
          {canEdit && (
            <Link href="/reservas/nueva"
              className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] hover:bg-[#E8C97A] text-black text-sm font-semibold rounded-lg transition-colors">
              <Plus size={16} /> Nueva
            </Link>
          )}
        </div>
      </div>

      {view === 'list'
        ? <ListView bookings={filtered} canEdit={canEdit} onDelete={handleDelete} />
        : <CalendarView bookings={bookings} filter={filter} boatColors={boatColors} boats={boats} canEdit={canEdit} />
      }
    </div>
  )
}
