'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  ArrowLeft, Anchor, CalendarDays, Users, CreditCard,
  CheckCircle, Clock, Phone, Mail, Package, Pencil, Printer
} from 'lucide-react'
import Link from 'next/link'

const statusConfig: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pendiente',  color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
  confirmed: { label: 'Confirmada', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  active:    { label: 'Activa',     color: 'text-green-400 bg-green-400/10 border-green-400/30' },
  completed: { label: 'Completada', color: 'text-gray-700 bg-gray-400/10 border-gray-400/30' },
  cancelled: { label: 'Cancelada',  color: 'text-red-400 bg-red-400/10 border-red-400/30' },
}

const paymentConfig: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Sin pagar', color: 'text-red-400' },
  partial:  { label: 'Parcial',   color: 'text-yellow-400' },
  paid:     { label: 'Pagado',    color: 'text-green-400' },
  refunded: { label: 'Devuelto',  color: 'text-gray-700' },
}

export default function ReservaDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    const supabase = createClient()
    const { data } = await supabase
      .from('bookings')
      .select('*, client:clients(*), boat:boats(*), booking_extras(*), captain:staff_users!captain_id(id,name,role), calendar_event_id')
      .eq('id', id)
      .single()
    setBooking(data)
    setLoading(false)
  }

  async function updateStatus(status: string) {
    setUpdatingStatus(true)
    const supabase = createClient()
    await supabase.from('bookings').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    // If cancelled, delete calendar event
    if (status === 'cancelled' && booking?.calendar_event_id) {
      fetch('/api/calendar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: booking.calendar_event_id }),
      }).catch(() => {})
    }
    await load()
    setUpdatingStatus(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="text-center py-20 text-gray-700">
        <p>Reserva no encontrada</p>
        <Link href="/reservas" className="text-[#C9A84C] text-sm mt-2 inline-block hover:underline">← Volver a reservas</Link>
      </div>
    )
  }

  const st = statusConfig[booking.status] ?? statusConfig.pending
  const pay = paymentConfig[booking.payment_status] ?? paymentConfig.pending
  const clientName = booking.client ? `${booking.client.first_name} ${booking.client.last_name}` : 'Sin cliente'
  const days = Math.max(1, Math.ceil((new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) / 86400000) + 1)

  const nextStatuses: Record<string, string[]> = {
    pending:   ['confirmed', 'cancelled'],
    confirmed: ['active', 'cancelled'],
    active:    ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-700 hover:text-gray-900 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-gray-900 font-bold text-lg font-mono">{booking.booking_number}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${st.color}`}>{st.label}</span>
            </div>
            <p className="text-gray-700 text-xs mt-0.5">
              Creada el {new Date(booking.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-700 hover:text-gray-900 border border-gray-200 rounded-lg hover:border-[#C9A84C]/30 transition-all">
            <Printer size={16} />
          </button>
          <Link href={`/reservas/${id}/editar`}
            className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C]/10 border border-[#C9A84C]/40 text-[#C9A84C] hover:bg-[#C9A84C]/20 rounded-lg text-sm font-medium transition-all">
            <Pencil size={14} /> Editar
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-4">

          {/* Cliente */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-gray-700 text-xs mb-3 flex items-center gap-1.5"><Users size={11} /> CLIENTE</p>
            {booking.client ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-[#C9A84C] font-bold">
                  {booking.client.first_name[0]}{booking.client.last_name[0]}
                </div>
                <div>
                  <p className="text-gray-900 font-semibold">{clientName}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {booking.client.email && (
                      <span className="text-gray-700 text-xs flex items-center gap-1"><Mail size={10} />{booking.client.email}</span>
                    )}
                    {booking.client.phone && (
                      <span className="text-gray-700 text-xs flex items-center gap-1"><Phone size={10} />{booking.client.phone}</span>
                    )}
                  </div>
                </div>
                <Link href={`/clientes/${booking.client.id}`} className="ml-auto text-gray-700 hover:text-[#C9A84C] transition-colors">
                  <Pencil size={14} />
                </Link>
              </div>
            ) : (
              <p className="text-gray-700 text-sm">Sin cliente asignado</p>
            )}
          </div>

          {/* Barco y fechas */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-gray-700 text-xs mb-3 flex items-center gap-1.5"><Anchor size={11} /> EMBARCACIÓN Y FECHAS</p>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                <Anchor size={18} className="text-[#C9A84C]" />
              </div>
              <div>
                <p className="text-gray-900 font-semibold">{booking.boat?.name ?? '—'}</p>
                <p className="text-gray-700 text-xs">
                  {booking.rental_type === 'with_captain' ? 'Con capitán' : 'Sin capitán'} ·{' '}
                  {booking.adults ?? 1} adultos{booking.children > 0 ? ` · ${booking.children} niños` : ''}
                </p>
                {booking.captain && (
                  <p className="text-[#C9A84C] text-xs mt-0.5 flex items-center gap-1">
                    🧑‍✈️ {booking.captain.name}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-100 rounded-lg p-3">
                <p className="text-gray-700 text-xs mb-1 flex items-center gap-1"><CalendarDays size={10} /> SALIDA</p>
                <p className="text-gray-900 font-medium">
                  {new Date(booking.start_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-gray-700 text-xs flex items-center gap-1 mt-0.5"><Clock size={10} />{booking.start_time?.slice(0, 5) ?? '—'}</p>
              </div>
              <div className="bg-gray-100 rounded-lg p-3">
                <p className="text-gray-700 text-xs mb-1 flex items-center gap-1"><CalendarDays size={10} /> REGRESO</p>
                <p className="text-gray-900 font-medium">
                  {new Date(booking.end_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-gray-700 text-xs flex items-center gap-1 mt-0.5"><Clock size={10} />{booking.end_time?.slice(0, 5) ?? '—'}</p>
              </div>
            </div>
            {booking.departure_port && (
              <p className="text-gray-700 text-xs mt-3">Puerto: {booking.departure_port}</p>
            )}
            {booking.route_notes && (
              <p className="text-gray-700 text-xs mt-1">Ruta: {booking.route_notes}</p>
            )}
          </div>

          {/* Extras */}
          {booking.booking_extras?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-gray-700 text-xs mb-3 flex items-center gap-1.5"><Package size={11} /> EXTRAS CONTRATADOS</p>
              <div className="space-y-2">
                {booking.booking_extras.map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{e.name} × {e.quantity}</span>
                    <span className="text-gray-900 font-medium">{Number(e.total).toLocaleString('es-ES')}€</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notas */}
          {booking.internal_notes && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-gray-700 text-xs mb-2">NOTAS INTERNAS</p>
              <p className="text-gray-700 text-sm">{booking.internal_notes}</p>
            </div>
          )}
        </div>

        {/* Columna lateral */}
        <div className="space-y-4">
          {/* Precio */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-gray-700 text-xs mb-3 flex items-center gap-1.5"><CreditCard size={11} /> PRECIO</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Base ({days}d)</span>
                <span className="text-gray-900">{Number(booking.base_price).toLocaleString('es-ES')}€</span>
              </div>
              {Number(booking.extras_total) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Extras</span>
                  <span className="text-gray-900">{Number(booking.extras_total).toLocaleString('es-ES')}€</span>
                </div>
              )}
              {Number(booking.discount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Descuento</span>
                  <span className="text-green-400">−{Number(booking.discount).toLocaleString('es-ES')}€</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
                <span className="text-gray-900">Total</span>
                <span className="text-[#C9A84C] text-lg">{Number(booking.total_price).toLocaleString('es-ES')}€</span>
              </div>
              {Number(booking.deposit_amount) > 0 && (
                <p className="text-gray-700 text-xs">Fianza: {Number(booking.deposit_amount).toLocaleString('es-ES')}€</p>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <span className={`text-xs font-semibold ${pay.color}`}>{pay.label}</span>
            </div>
          </div>

          {/* Cambiar estado */}
          {nextStatuses[booking.status]?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-gray-700 text-xs mb-3">CAMBIAR ESTADO</p>
              <div className="space-y-2">
                {nextStatuses[booking.status].map(s => {
                  const sc = statusConfig[s]
                  return (
                    <button
                      key={s}
                      onClick={() => updateStatus(s)}
                      disabled={updatingStatus}
                      className={`w-full py-2 rounded-lg text-sm font-medium border transition-all disabled:opacity-50 ${sc.color}`}
                    >
                      {updatingStatus ? '...' : `→ ${sc.label}`}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Info adicional */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2 text-xs text-gray-700">
            <div className="flex justify-between">
              <span>Origen</span>
              <span className="text-gray-700 capitalize">{booking.source ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span>Actualizada</span>
              <span className="text-gray-700">{new Date(booking.updated_at).toLocaleDateString('es-ES')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
