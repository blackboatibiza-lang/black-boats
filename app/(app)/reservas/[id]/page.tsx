'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  ArrowLeft, Anchor, CalendarDays, Users, CreditCard,
  CheckCircle, Clock, Phone, Mail, Package, Pencil, Printer, FileText
} from 'lucide-react'
import Link from 'next/link'

const statusConfig: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Pendiente',  color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
  confirmed:  { label: 'Confirmada', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  reservado:  { label: 'Reservado',  color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  active:     { label: 'Activa',     color: 'text-green-400 bg-green-400/10 border-green-400/30' },
  completed:  { label: 'Completada', color: 'text-gray-700 bg-gray-400/10 border-gray-400/30' },
  finalizado: { label: 'Finalizado', color: 'text-gray-700 bg-gray-400/10 border-gray-400/30' },
  cancelled:  { label: 'Cancelada',  color: 'text-red-400 bg-red-400/10 border-red-400/30' },
  cancelado:  { label: 'Cancelado',  color: 'text-red-400 bg-red-400/10 border-red-400/30' },
}

function effectiveStatus(b: any): string {
  if (!b) return 'pending'
  if (b.status === 'cancelled' || b.status === 'cancelado') return b.status
  if (b.status === 'finalizado' || b.status === 'completed') return b.status
  const endDate = b.end_date || b.start_date
  const endTime = b.end_time || '23:59'
  if (endDate && new Date(`${endDate}T${endTime}`) < new Date()) return 'finalizado'
  return b.status
}

const paymentConfig: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Sin pagar', color: 'text-red-400' },
  partial:  { label: 'Parcial',   color: 'text-yellow-400' },
  paid:     { label: 'Pagado',    color: 'text-green-400' },
  refunded: { label: 'Devuelto',  color: 'text-gray-700' },
}

function calcPayStatus(b: any): { label: string; color: string } {
  const notes: string = b.internal_notes ?? ''
  const payLine = notes.split(' | ').find((p: string) =>
    /cash|card|transfer|bizum|link/i.test(p) &&
    !p.toLowerCase().startsWith('método fianza') &&
    !p.toLowerCase().startsWith('link fianza')
  )
  let paid = 0
  if (payLine) {
    const amounts = payLine.match(/[\d.]+(?=€)/g)
    if (amounts?.length) paid = amounts.reduce((s: number, n: string) => s + parseFloat(n), 0)
    else { const m = payLine.match(/:\s*([\d.]+)/); if (m) paid = parseFloat(m[1]) }
  }
  const total = Number(b.total_price ?? 0)
  if (paid <= 0) return paymentConfig[b.payment_status] ?? paymentConfig.pending
  if (paid >= total) return { label: 'Pagado', color: 'text-green-500' }
  return { label: `Falta ${(total - paid).toLocaleString('es-ES')}€`, color: 'text-yellow-500' }
}

export default function ReservaDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [sendingContract, setSendingContract] = useState(false)
  const [contract, setContract] = useState<any>(null)
  const [editingPrice, setEditingPrice] = useState(false)
  const [priceForm, setPriceForm] = useState({ base_price: '', discount: '', total_price: '' })
  const [savingPrice, setSavingPrice] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    const supabase = createClient()
    const { data } = await supabase
      .from('bookings')
      .select('*, client:clients(*), boat:boats(*), booking_extras(*), calendar_event_id')
      .eq('id', id)
      .single()
    setBooking(data)
    if (data) {
      const { data: c } = await supabase
        .from('contracts').select('token,status').eq('booking_id', id).maybeSingle()
      setContract(c)
    }
    setLoading(false)
  }

  function openPriceEdit() {
    setPriceForm({
      base_price: String(booking.base_price ?? ''),
      discount: String(booking.discount ?? '0'),
      total_price: String(booking.total_price ?? ''),
    })
    setEditingPrice(true)
  }

  async function savePrice() {
    setSavingPrice(true)
    const supabase = createClient()
    await supabase.from('bookings').update({
      base_price: Number(priceForm.base_price),
      discount: Number(priceForm.discount) || 0,
      total_price: Number(priceForm.total_price),
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    setSavingPrice(false)
    setEditingPrice(false)
    load()
  }

  async function updateStatus(status: string) {
    setUpdatingStatus(true)
    const supabase = createClient()
    // Map display statuses to valid DB enum values
    const dbStatus = status === 'cancelado' ? 'cancelled' : status === 'finalizado' ? 'completed' : status === 'reservado' ? 'confirmed' : status
    await supabase.from('bookings').update({ status: dbStatus, updated_at: new Date().toISOString() }).eq('id', id)
    // If cancelled, delete calendar event
    if (dbStatus === 'cancelled' && booking?.calendar_event_id) {
      fetch('/api/calendar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: booking.calendar_event_id }),
      }).catch(() => {})
    }
    await load()
    setUpdatingStatus(false)
  }

  async function sendContract() {
    if (!booking?.client?.phone) return
    setSendingContract(true)
    // Open the window immediately (before async) to avoid popup blockers
    const waWindow = window.open('', '_blank')
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: id }),
      })
      const { token } = await res.json()
      const contractUrl = `https://black-boats-sepia.vercel.app/contrato/${token}`
      const name = booking.client.first_name
      const rawPhone = booking.client.phone.replace(/\D/g, '')
      // Add Spain country code if not already present
      const phone = rawPhone.startsWith('34') && rawPhone.length > 10 ? rawPhone : `34${rawPhone}`
      const boat = booking.boat?.name ?? ''
      const startDate = new Date(booking.start_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
      const endDate = new Date(booking.end_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
      const startTime = booking.start_time?.slice(0, 5) ?? ''
      const endTime = booking.end_time?.slice(0, 5) ?? ''
      const captain = booking.captain_id ? `\n🧑‍✈️ Capitán: ${booking.captain_id}` : ''
      const msg = `Hola ${name}, aquí tienes el contrato de alquiler náutico de Black Boats Ibiza para revisar y firmar.

🚤 Embarcación: ${boat}
📅 Salida: ${startDate}${startTime ? ` a las ${startTime}` : ''}
📅 Regreso: ${endDate}${endTime ? ` a las ${endTime}` : ''}${captain}

Por favor, accede al contrato y fírmalo digitalmente antes de la fecha de inicio:
${contractUrl}`
      const text = encodeURIComponent(msg)
      if (waWindow) waWindow.location.href = `https://wa.me/${phone}?text=${text}`
      setContract({ token, status: contract?.status ?? 'pending' })
    } catch {
      if (waWindow) waWindow.close()
    } finally {
      setSendingContract(false)
    }
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

  const st = statusConfig[effectiveStatus(booking)] ?? statusConfig.pending
  const pay = calcPayStatus(booking)
  const clientName = booking.client ? `${booking.client.first_name} ${booking.client.last_name}` : 'Sin cliente'
  const days = Math.max(1, Math.ceil((new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) / 86400000) + 1)

  const nextStatuses: Record<string, string[]> = {
    pending:    ['reservado', 'cancelado'],
    confirmed:  ['reservado', 'cancelado'],
    reservado:  ['finalizado', 'cancelado'],
    active:     ['finalizado', 'cancelado'],
    completed:  [],
    finalizado: [],
    cancelled:  [],
    cancelado:  [],
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
          {booking.client?.phone && (
            <button
              onClick={sendContract}
              disabled={sendingContract}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white hover:bg-green-600 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            >
              <FileText size={14} />
              {sendingContract ? 'Enviando…' : 'Enviar confirmación'}
            </button>
          )}
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
                {booking.captain_id && (
                  <p className="text-[#C9A84C] text-xs mt-0.5 flex items-center gap-1">
                    🧑‍✈️ {booking.captain_id}
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
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-700 text-xs flex items-center gap-1.5"><CreditCard size={11} /> PRECIO</p>
              {!editingPrice && (
                <button onClick={openPriceEdit} className="text-gray-400 hover:text-[#C9A84C] transition-colors" title="Editar precio">
                  <Pencil size={13} />
                </button>
              )}
            </div>

            {editingPrice ? (
              <div className="space-y-3">
                <div>
                  <label className="text-gray-700 text-xs block mb-1">Precio base (€)</label>
                  <input type="number" step="0.01" value={priceForm.base_price}
                    onChange={e => setPriceForm(p => ({ ...p, base_price: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/50" />
                </div>
                <div>
                  <label className="text-gray-700 text-xs block mb-1">Descuento (€)</label>
                  <input type="number" step="0.01" value={priceForm.discount}
                    onChange={e => setPriceForm(p => ({ ...p, discount: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/50" />
                </div>
                <div>
                  <label className="text-gray-700 text-xs block mb-1 font-semibold">Total (€)</label>
                  <input type="number" step="0.01" value={priceForm.total_price}
                    onChange={e => setPriceForm(p => ({ ...p, total_price: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-100 border border-[#C9A84C]/40 rounded-lg text-sm text-gray-900 font-bold focus:outline-none focus:border-[#C9A84C]/80" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEditingPrice(false)} className="flex-1 py-2 border border-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-50">Cancelar</button>
                  <button onClick={savePrice} disabled={savingPrice}
                    className="flex-1 py-2 bg-[#C9A84C] text-black text-xs font-semibold rounded-lg hover:bg-[#E8C97A] disabled:opacity-60">
                    {savingPrice ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            ) : (
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
                {(() => {
                  const notes = booking.internal_notes ?? ''
                  const payLine = notes.split(' | ').find((p: string) => /cash|card|transfer|bizum|link/i.test(p) && !p.startsWith('Método fianza'))
                  const pendLine = notes.split(' | ').find((p: string) => p.startsWith('Falta por pagar:'))
                  if (!payLine && !pendLine) return null
                  return (
                    <div className="border-t border-gray-200 pt-2 space-y-1 text-xs">
                      {payLine && <p className="text-gray-700">💳 {payLine}</p>}
                      {pendLine && <p className="font-bold text-red-500">{pendLine}</p>}
                    </div>
                  )
                })()}
                <div className="pt-2 border-t border-gray-200">
                  <span className={`text-xs font-semibold ${pay.color}`}>{pay.label}</span>
                </div>
              </div>
            )}
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

          {/* Contrato digital */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#C9A84C]/10 flex items-center justify-center">
                  <FileText size={16} className="text-[#C9A84C]" />
                </div>
                <div>
                  <p className="text-gray-900 text-sm font-medium">Contrato digital</p>
                  {contract?.status === 'signed' ? (
                    <p className="text-green-600 text-xs flex items-center gap-1 mt-0.5">
                      <CheckCircle size={10} /> Firmado
                    </p>
                  ) : contract ? (
                    <p className="text-yellow-500 text-xs flex items-center gap-1 mt-0.5">
                      <Clock size={10} /> Pendiente de firma
                    </p>
                  ) : (
                    <p className="text-gray-400 text-xs mt-0.5">No enviado</p>
                  )}
                </div>
              </div>
              {contract ? (
                <a
                  href={`https://black-boats-sepia.vercel.app/contrato/${contract.token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-700 hover:text-[#C9A84C] text-xs transition-colors whitespace-nowrap"
                >
                  Ver contrato →
                </a>
              ) : booking.client?.phone ? (
                <button
                  onClick={sendContract}
                  disabled={sendingContract}
                  className="text-[#C9A84C] text-xs hover:underline disabled:opacity-50"
                >
                  {sendingContract ? 'Enviando…' : 'Enviar →'}
                </button>
              ) : null}
            </div>
          </div>

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
