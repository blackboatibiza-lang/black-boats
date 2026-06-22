'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  ArrowLeft, CheckCircle, Clock, Tag, Info,
  CreditCard, Link as LinkIcon,
} from 'lucide-react'

const TARIFF_INFO: Record<string, { label: string; desc: string; color: string }> = {
  sin_incluido: { label: 'Sin patrón ni combustible', desc: 'El cliente navega por su cuenta (requiere licencia)', color: 'text-gray-300' },
  patron_fuel:  { label: 'Patrón + Combustible incluido', desc: 'Nuestro capitán y el fuel están incluidos', color: 'text-[#C9A84C]' },
  es_vedra:     { label: 'Es Vedrà Full Day', desc: 'Ruta guiada a Es Vedrà, Atlantis y Mambos', color: 'text-blue-400' },
  formentera:   { label: 'Formentera Full Day', desc: 'Ruta a Formentera o Cala Jondal', color: 'text-purple-400' },
}

const TARIFFS_FOR_RENTAL: Record<string, string[]> = {
  bareboat:     ['sin_incluido'],
  with_captain: ['patron_fuel', 'es_vedra', 'formentera'],
}

const DURATION_INFO: Record<string, string> = { half: 'Medio día', full: 'Día completo' }

const SEASON_LABELS: Record<string, string> = {
  MAY_OCT: 'May / Oct', JUN_SEP: 'Jun / Sep', JUL_AGO: 'Jul / Ago',
  JUN: 'Junio', JUL: 'Julio', AGO: 'Agosto', SEP: 'Septiembre',
}

const PAYMENT_METHODS = [
  { value: 'cash',      label: '💵 Efectivo' },
  { value: 'card',      label: '💳 Tarjeta' },
  { value: 'transfer',  label: '🏦 Transferencia' },
  { value: 'bizum',     label: '📱 Bizum' },
  { value: 'link',      label: '🔗 Link de pago' },
]

const SOURCES = [
  { value: 'direct',   label: 'Directo' },
  { value: 'web',      label: 'Web' },
  { value: 'booking',  label: 'Booking.com' },
  { value: 'airbnb',   label: 'Airbnb' },
  { value: 'referral', label: 'Referido' },
  { value: 'other',    label: 'Otro' },
]

function getCandidateSeasons(date: string): string[] {
  if (!date) return []
  const month = new Date(date).getMonth() + 1
  if (month === 5 || month === 10) return ['MAY_OCT']
  if (month === 6)  return ['JUN_SEP', 'JUN']
  if (month === 7)  return ['JUL_AGO', 'JUL']
  if (month === 8)  return ['JUL_AGO', 'AGO']
  if (month === 9)  return ['JUN_SEP', 'SEP']
  return ['MAY_OCT']
}

function formatP(n: number) { return n.toLocaleString('es-ES') + '€' }

export default function EditarReservaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [boats, setBoats] = useState<any[]>([])
  const [allPricing, setAllPricing] = useState<any[]>([])
  const [staffUsers, setStaffUsers] = useState<any[]>([])
  const [captainId, setCaptainId] = useState<string>('')

  // Campos editables
  const [rentalType, setRentalType]     = useState<'with_captain' | 'bareboat'>('with_captain')
  const [selectedBoatId, setSelectedBoatId] = useState('')
  const [selectedBoat, setSelectedBoat] = useState<any>(null)
  const [startDate, setStartDate]       = useState('')
  const [endDate, setEndDate]           = useState('')
  const [startTime, setStartTime]       = useState('09:00')
  const [endTime, setEndTime]           = useState('18:00')
  const [adults, setAdults]             = useState(2)
  const [children, setChildren]         = useState(0)
  const [departurePort, setDeparturePort] = useState('')
  const [routeNotes, setRouteNotes]     = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [source, setSource]             = useState('direct')

  // Tarifa
  const [selectedTariff, setSelectedTariff]   = useState('patron_fuel')
  const [selectedDuration, setSelectedDuration] = useState('full')
  const [earlyBird, setEarlyBird]             = useState(false)
  const [selectedPricingRow, setSelectedPricingRow] = useState<any>(null)

  // Precio
  const [basePrice, setBasePrice]       = useState(0)
  const [extrasTotal, setExtrasTotal]   = useState(0)
  const [discount, setDiscount]         = useState(0)
  const [manualPrice, setManualPrice]   = useState(false)
  const [customBase, setCustomBase]     = useState(0)

  // Pago
  const [paymentMethod, setPaymentMethod]         = useState('cash')
  const [depositMethod, setDepositMethod]         = useState('cash')
  const [depositAmount, setDepositAmount]         = useState(0)
  const [paymentLink, setPaymentLink]             = useState('')
  const [depositLink, setDepositLink]             = useState('')
  const [paymentStatus, setPaymentStatus]         = useState('pending')

  const [calendarEventId, setCalendarEventId]     = useState<string | null>(null)
  const [bookingNumber, setBookingNumber]         = useState('')
  const [clientName, setClientName]               = useState('')

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    const supabase = createClient()
    const [{ data: booking }, { data: boatsData }, { data: pricingData }, { data: staffData }] = await Promise.all([
      supabase.from('bookings')
        .select('*, boat:boats(*), booking_extras(*), client:clients(first_name,last_name), calendar_event_id, booking_number')
        .eq('id', id).single(),
      supabase.from('boats').select('*').order('name'),
      supabase.from('boat_pricing').select('*'),
      supabase.from('staff_users').select('id,name,role').eq('active', true).order('name'),
    ])

    if (booking) {
      setRentalType(booking.rental_type ?? 'with_captain')
      setSelectedBoatId(booking.boat_id ?? '')
      setSelectedBoat(booking.boat ?? null)
      setStartDate(booking.start_date ?? '')
      setEndDate(booking.end_date ?? '')
      setStartTime(booking.start_time?.slice(0, 5) ?? '09:00')
      setEndTime(booking.end_time?.slice(0, 5) ?? '18:00')
      setAdults(booking.adults ?? 2)
      setChildren(booking.children ?? 0)
      setDeparturePort(booking.departure_port ?? 'Club Náutico San Antonio')
      setRouteNotes(booking.route_notes ?? '')
      setInternalNotes(booking.internal_notes ?? '')
      setSource(booking.source ?? 'direct')
      setBasePrice(Number(booking.base_price ?? 0))
      setCustomBase(Number(booking.base_price ?? 0))
      setExtrasTotal(Number(booking.extras_total ?? 0))
      setDiscount(Number(booking.discount ?? 0))
      setDepositAmount(Number(booking.deposit_amount ?? 0))
      setPaymentStatus(booking.payment_status ?? 'pending')

      // Extraer método y link desde internal_notes si se guardaron
      const notes = booking.internal_notes ?? ''
      const mMatch = notes.match(/Método pago: (\w+)/)
      if (mMatch) setPaymentMethod(mMatch[1])
      const lMatch = notes.match(/Link pago: (.+?)(\s*\||\s*$)/)
      if (lMatch) setPaymentLink(lMatch[1].trim())
    }

    if (booking?.captain_id) setCaptainId(booking.captain_id)
    if (booking?.calendar_event_id) setCalendarEventId(booking.calendar_event_id)
    if (booking?.booking_number) setBookingNumber(booking.booking_number)
    if (booking?.client) setClientName(`${booking.client.first_name} ${booking.client.last_name}`)
    setBoats(boatsData ?? [])
    setAllPricing(pricingData ?? [])
    setStaffUsers(staffData ?? [])
    setLoading(false)
  }

  // Sync selectedBoat cuando cambia el id
  useEffect(() => {
    const b = boats.find(b => b.id === selectedBoatId)
    setSelectedBoat(b ?? null)
  }, [selectedBoatId, boats])

  // Recalcular pricing row
  useEffect(() => {
    if (!selectedBoatId || !startDate) { setSelectedPricingRow(null); return }
    const candidates = getCandidateSeasons(startDate)
    const match = allPricing.find(r =>
      r.boat_id === selectedBoatId &&
      candidates.includes(r.season) &&
      r.tariff === selectedTariff &&
      r.duration === selectedDuration
    )
    setSelectedPricingRow(match ?? null)
    if (match && !manualPrice) {
      const raw = Number(match.price)
      setBasePrice(earlyBird ? Math.round(raw * 0.9) : raw)
    }
  }, [selectedBoatId, startDate, selectedTariff, selectedDuration, allPricing, earlyBird, manualPrice])

  // Al cambiar rental type, resetear tarifa
  useEffect(() => {
    setSelectedTariff(rentalType === 'bareboat' ? 'sin_incluido' : 'patron_fuel')
    if (rentalType === 'bareboat' && depositAmount === 0) setDepositAmount(500)
  }, [rentalType])

  const availableTariffs = selectedBoatId && startDate
    ? [...new Set(
        allPricing
          .filter(r =>
            r.boat_id === selectedBoatId &&
            getCandidateSeasons(startDate).includes(r.season) &&
            TARIFFS_FOR_RENTAL[rentalType].includes(r.tariff)
          ).map(r => r.tariff)
      )]
    : []

  const availableDurations = selectedBoatId && startDate && selectedTariff
    ? [...new Set(
        allPricing
          .filter(r =>
            r.boat_id === selectedBoatId &&
            getCandidateSeasons(startDate).includes(r.season) &&
            r.tariff === selectedTariff
          ).map(r => r.duration)
      )]
    : []

  const fuelExtra = selectedPricingRow?.fuel_extra ? Number(selectedPricingRow.fuel_extra) : 0
  const effectiveBase = manualPrice ? customBase : basePrice
  const totalPrice = Math.max(0, effectiveBase + fuelExtra + extrasTotal - discount)
  const season = startDate ? getCandidateSeasons(startDate)[0] : ''

  async function handleSave() {
    setSaving(true); setError('')
    const supabase = createClient()
    try {
      const notes = [
        internalNotes,
        selectedPricingRow ? `Tarifa: ${TARIFF_INFO[selectedTariff]?.label}` : '',
        earlyBird ? 'Madrugadores −10%' : '',
        fuelExtra ? `Fuel extra: +${fuelExtra}€` : '',
        `Método pago: ${paymentMethod}`,
        paymentLink ? `Link pago: ${paymentLink}` : '',
        depositMethod !== paymentMethod ? `Método fianza: ${depositMethod}` : '',
        depositLink ? `Link fianza: ${depositLink}` : '',
      ].filter(Boolean).join(' | ')

      const { error: err } = await supabase.from('bookings').update({
        boat_id: selectedBoatId,
        rental_type: rentalType,
        captain_id: rentalType === 'with_captain' && captainId ? captainId : null,
        start_date: startDate,
        end_date: endDate || startDate,
        start_time: startTime,
        end_time: endTime,
        adults,
        children,
        base_price: effectiveBase,
        extras_total: extrasTotal + fuelExtra,
        discount,
        total_price: totalPrice,
        deposit_amount: depositAmount,
        payment_status: paymentStatus,
        departure_port: departurePort,
        route_notes: routeNotes || null,
        internal_notes: notes || null,
        source,
        updated_at: new Date().toISOString(),
      }).eq('id', id)

      if (err) throw new Error(`${err.message}${err.details ? ' — ' + err.details : ''}`)

      // Sync Google Calendar
      if (calendarEventId) {
        fetch('/api/calendar', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: calendarEventId,
            booking_number: bookingNumber,
            start_date: startDate,
            end_date: endDate || startDate,
            start_time: startTime,
            end_time: endTime,
            client_name: clientName,
            boat_name: selectedBoat?.name ?? '',
            total_price: totalPrice,
            adults,
            rental_type: rentalType,
            departure_port: departurePort,
          }),
        }).catch(() => {})
      }

      router.push(`/reservas/${id}`)
    } catch (e: any) {
      setError(e.message ?? 'Error al guardar')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const inputCls = "w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/50"
  const labelCls = "text-gray-400 text-xs mb-1.5 block"

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-900 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-gray-900 font-bold text-lg">Editar reserva</h1>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] hover:bg-[#E8C97A] disabled:opacity-60 text-black text-sm font-semibold rounded-lg transition-all">
          {saving
            ? <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> Guardando...</>
            : <><CheckCircle size={16} /> Guardar cambios</>}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm font-mono">{error}</div>
      )}

      {/* ── BARCO Y TIPO ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="text-gray-900 font-semibold text-sm">Embarcación</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelCls}>Barco</label>
            <select value={selectedBoatId} onChange={e => setSelectedBoatId(e.target.value)} className={inputCls}>
              <option value="">— Seleccionar —</option>
              {boats.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Tipo de alquiler</label>
          <div className="flex gap-2">
            {[
              { v: 'with_captain', l: '🧑‍✈️ Con capitán' },
              { v: 'bareboat',     l: '🎯 Sin capitán' },
            ].map(t => (
              <button key={t.v} onClick={() => setRentalType(t.v as any)}
                disabled={selectedBoat?.captain_required && t.v === 'bareboat'}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${rentalType === t.v ? 'bg-[#C9A84C]/10 border-[#C9A84C]/40 text-[#C9A84C]' : 'border-gray-200 text-gray-400 hover:text-gray-900'}`}>
                {t.l}
              </button>
            ))}
          </div>
        </div>
        {rentalType === 'with_captain' && staffUsers.length > 0 && (
          <div>
            <label className={labelCls}>Capitán asignado</label>
            <select value={captainId} onChange={e => setCaptainId(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/50">
              <option value="">— Sin asignar —</option>
              {staffUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name} · {u.role}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── FECHA Y HORA ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="text-gray-900 font-semibold text-sm">Fecha y hora</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Fecha salida</label>
            <input type="date" value={startDate}
              onChange={e => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value) }}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Fecha regreso</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              min={startDate} className={inputCls} />
          </div>
          <div>
            <label className={labelCls + ' flex items-center gap-1'}><Clock size={11} /> Hora salida</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls + ' flex items-center gap-1'}><Clock size={11} /> Hora regreso</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Adultos</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setAdults(Math.max(1, adults - 1))} className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 text-gray-900 hover:border-[#C9A84C]/40">−</button>
              <span className="text-gray-900 font-semibold w-5 text-center">{adults}</span>
              <button onClick={() => setAdults(adults + 1)} className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 text-gray-900 hover:border-[#C9A84C]/40">+</button>
            </div>
          </div>
          <div>
            <label className={labelCls}>Niños</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setChildren(Math.max(0, children - 1))} className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 text-gray-900 hover:border-[#C9A84C]/40">−</button>
              <span className="text-gray-900 font-semibold w-5 text-center">{children}</span>
              <button onClick={() => setChildren(children + 1)} className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 text-gray-900 hover:border-[#C9A84C]/40">+</button>
            </div>
          </div>
          <div>
            <label className={labelCls}>Origen</label>
            <select value={source} onChange={e => setSource(e.target.value)} className={inputCls}>
              {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Puerto de salida</label>
            <input value={departurePort} onChange={e => setDeparturePort(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Ruta / destino</label>
            <input value={routeNotes} onChange={e => setRouteNotes(e.target.value)}
              placeholder="Formentera, Es Vedrà..." className={inputCls} />
          </div>
        </div>
      </div>

      {/* ── TARIFA ── */}
      {startDate && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-900 font-semibold text-sm flex items-center gap-2"><Tag size={14} /> Tarifa</h3>
            {season && <span className="text-[#C9A84C] text-xs bg-[#C9A84C]/10 px-2 py-0.5 rounded-full">Temporada: {SEASON_LABELS[season] ?? season}</span>}
          </div>

          {availableTariffs.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {availableTariffs.map(t => {
                const info = TARIFF_INFO[t]
                return (
                  <button key={t} onClick={() => setSelectedTariff(t)}
                    className={`text-left p-3 rounded-lg border transition-all ${selectedTariff === t ? 'bg-gray-100 border-[#C9A84C]/40' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium ${info?.color ?? 'text-gray-300'}`}>{info?.label ?? t}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{info?.desc}</p>
                      </div>
                      {selectedTariff === t && <CheckCircle size={15} className="text-[#C9A84C]" />}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-yellow-400 text-xs bg-yellow-400/5 border border-yellow-400/20 rounded-lg px-3 py-2">
              <Info size={13} /> Sin tarifas configuradas para este barco y mes
            </div>
          )}

          {availableDurations.length > 0 && (
            <div>
              <label className={labelCls}>Duración</label>
              <div className="flex gap-2">
                {availableDurations.map(d => {
                  const row = allPricing.find(r =>
                    r.boat_id === selectedBoatId &&
                    getCandidateSeasons(startDate).includes(r.season) &&
                    r.tariff === selectedTariff && r.duration === d
                  )
                  return (
                    <button key={d} onClick={() => setSelectedDuration(d)}
                      className={`flex-1 py-2.5 px-3 rounded-lg text-sm border transition-all ${selectedDuration === d ? 'bg-[#C9A84C]/10 border-[#C9A84C]/40 text-[#C9A84C]' : 'border-gray-200 text-gray-400 hover:text-gray-900'}`}>
                      <span className="font-medium">{DURATION_INFO[d] ?? d}</span>
                      {row && <span className="text-xs ml-1.5 opacity-70">({row.hours})</span>}
                      {row && <span className="block text-sm font-bold mt-0.5">{Number(row.price).toLocaleString('es-ES')}€</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer p-3 bg-gray-50 rounded-lg border border-gray-200">
            <input type="checkbox" checked={earlyBird} onChange={e => setEarlyBird(e.target.checked)} className="w-4 h-4 accent-[#C9A84C]" />
            <p className="text-gray-300 text-sm">Especial madrugadores <span className="text-green-400">−10%</span></p>
          </label>
        </div>
      )}

      {/* ── PRECIO ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-gray-900 font-semibold text-sm flex items-center gap-2"><CreditCard size={14} /> Precio</h3>
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={manualPrice} onChange={e => setManualPrice(e.target.checked)} className="w-3.5 h-3.5 accent-[#C9A84C]" />
            Precio manual
          </label>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Tarifa base{earlyBird ? ' (−10%)' : ''}</span>
            {manualPrice
              ? <div className="flex items-center gap-1">
                  <input type="number" value={customBase} onChange={e => setCustomBase(Number(e.target.value))} min={0}
                    className="w-24 px-2 py-1 bg-gray-200 border border-[#3A3A3A] rounded text-gray-900 text-right text-sm focus:outline-none focus:border-[#C9A84C]/50" />
                  <span className="text-gray-400 text-xs">€</span>
                </div>
              : <span className="text-gray-900 font-medium">{formatP(basePrice)}</span>
            }
          </div>
          {fuelExtra > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Combustible extra</span>
              <span className="text-gray-900">+{formatP(fuelExtra)}</span>
            </div>
          )}
          {extrasTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Extras</span>
              <span className="text-gray-900">{formatP(extrasTotal)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Descuento</span>
            <div className="flex items-center gap-1">
              <input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} min={0}
                className="w-20 px-2 py-1 bg-gray-200 border border-[#3A3A3A] rounded text-gray-900 text-right text-sm focus:outline-none" />
              <span className="text-gray-400 text-xs">€</span>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-base">
            <span className="text-gray-900">TOTAL</span>
            <span className="text-[#C9A84C] text-xl">{formatP(totalPrice)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <label className={labelCls + ' mb-0'}>Estado pago</label>
          <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/50">
            <option value="pending">Sin pagar</option>
            <option value="partial">Parcial</option>
            <option value="paid">Pagado</option>
            <option value="refunded">Devuelto</option>
          </select>
        </div>
      </div>

      {/* ── MÉTODO DE PAGO ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
        <h3 className="text-gray-900 font-semibold text-sm">Método de pago y fianza</h3>

        {/* Pago principal */}
        <div className="space-y-2">
          <label className={labelCls}>Método de pago del total</label>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map(m => (
              <button key={m.value} onClick={() => setPaymentMethod(m.value)}
                className={`py-2.5 px-3 rounded-lg text-sm border text-left transition-all ${paymentMethod === m.value ? 'bg-[#C9A84C]/10 border-[#C9A84C]/50 text-gray-900 font-medium' : 'border-gray-200 text-gray-400 hover:text-gray-900'}`}>
                {m.label}
              </button>
            ))}
          </div>
          {paymentMethod === 'link' && (
            <div className="flex items-center gap-2 mt-2">
              <LinkIcon size={14} className="text-[#C9A84C] flex-shrink-0" />
              <input
                type="url"
                value={paymentLink}
                onChange={e => setPaymentLink(e.target.value)}
                placeholder="https://pay.sumup.com/... o Stripe link"
                className="flex-1 px-3 py-2 bg-gray-100 border border-[#C9A84C]/30 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C9A84C]/60"
              />
            </div>
          )}
        </div>

        {/* Fianza */}
        <div className="border-t border-gray-200 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm font-medium">Fianza</p>
              <p className="text-gray-400 text-xs">{rentalType === 'bareboat' ? 'Requerida (sin patrón)' : 'Opcional'}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={depositAmount}
                onChange={e => setDepositAmount(Number(e.target.value))}
                min={0}
                className="w-24 px-3 py-2 bg-gray-200 border border-[#3A3A3A] rounded-lg text-gray-900 text-right text-sm font-semibold focus:outline-none focus:border-[#C9A84C]/50"
              />
              <span className="text-gray-400 text-sm">€</span>
            </div>
          </div>

          {depositAmount > 0 && (
            <>
              <label className={labelCls}>Método de cobro de la fianza</label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button key={m.value} onClick={() => setDepositMethod(m.value)}
                    className={`py-2.5 px-3 rounded-lg text-sm border text-left transition-all ${depositMethod === m.value ? 'bg-[#C9A84C]/10 border-[#C9A84C]/50 text-gray-900 font-medium' : 'border-gray-200 text-gray-400 hover:text-gray-900'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
              {depositMethod === 'link' && (
                <div className="flex items-center gap-2">
                  <LinkIcon size={14} className="text-[#C9A84C] flex-shrink-0" />
                  <input
                    type="url"
                    value={depositLink}
                    onChange={e => setDepositLink(e.target.value)}
                    placeholder="Link de pago para la fianza"
                    className="flex-1 px-3 py-2 bg-gray-100 border border-[#C9A84C]/30 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C9A84C]/60"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── NOTAS ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-gray-900 font-semibold text-sm mb-3">Notas internas</h3>
        <textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} rows={3}
          placeholder="Solo visible para el equipo..."
          className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C9A84C]/50 resize-none" />
      </div>

      {/* Botón guardar abajo */}
      <div className="flex justify-end gap-3">
        <button onClick={() => router.back()}
          className="px-5 py-2.5 border border-gray-200 text-gray-400 hover:text-gray-900 rounded-lg text-sm transition-all">
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] hover:bg-[#E8C97A] disabled:opacity-60 text-black text-sm font-semibold rounded-lg transition-all">
          {saving
            ? <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> Guardando...</>
            : <><CheckCircle size={16} /> Guardar cambios</>}
        </button>
      </div>
    </div>
  )
}
