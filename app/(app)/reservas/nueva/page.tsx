'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Users, Anchor, CalendarDays, Package, CheckCircle,
  ChevronRight, ChevronLeft, Plus, Search, X, Clock,
  Tag, Star, Info,
} from 'lucide-react'

type Step = 1 | 2 | 3 | 4 | 5

interface SelectedExtra {
  id: string; name: string; price: number; unit: string; quantity: number
}

const STEPS = [
  { n: 1, label: 'Cliente',  icon: Users },
  { n: 2, label: 'Barco',   icon: Anchor },
  { n: 3, label: 'Tarifa',  icon: Tag },
  { n: 4, label: 'Extras',  icon: Package },
  { n: 5, label: 'Resumen', icon: CheckCircle },
]

const SOURCES = [
  { value: 'direct',   label: 'Directo' },
  { value: 'web',      label: 'Web' },
  { value: 'booking',  label: 'Booking.com' },
  { value: 'airbnb',   label: 'Airbnb' },
  { value: 'referral', label: 'Referido' },
  { value: 'other',    label: 'Otro' },
]

const TARIFF_INFO: Record<string, { label: string; desc: string; color: string }> = {
  sin_incluido: { label: 'Sin patrón ni combustible', desc: 'El cliente navega por su cuenta (requiere licencia)', color: 'text-gray-300' },
  patron_fuel:  { label: 'Patrón + Combustible incluido', desc: 'Nuestro capitán y el fuel están incluidos en el precio', color: 'text-[#C9A84C]' },
  es_vedra:     { label: 'Es Vedrà Full Day', desc: 'Ruta guiada a Es Vedrà, Atlantis y Mambos (solo con capitán)', color: 'text-blue-400' },
  formentera:   { label: 'Formentera Full Day', desc: 'Ruta a Formentera o Cala Jondal (solo con capitán)', color: 'text-purple-400' },
}

const DURATION_INFO: Record<string, { label: string }> = {
  half: { label: 'Medio día' },
  full: { label: 'Día completo' },
}

const SEASON_LABELS: Record<string, string> = {
  MAY_OCT: 'May / Oct', JUN_SEP: 'Jun / Sep', JUL_AGO: 'Jul / Ago',
  JUN: 'Junio', JUL: 'Julio', AGO: 'Agosto', SEP: 'Septiembre',
}

function getSeasonForDate(date: string): string {
  if (!date) return ''
  const month = new Date(date).getMonth() + 1
  // Meses para Arendel (individual) — también sirven para el resto como fallback
  if (month === 6)  return 'JUN'
  if (month === 7)  return 'JUL'
  if (month === 8)  return 'AGO'
  if (month === 9)  return 'SEP'
  // Para lanchas normales agrupa
  // JUL_AGO, JUN_SEP, MAY_OCT
  if (month === 5 || month === 10) return 'MAY_OCT'
  return 'MAY_OCT'
}

// Lanza temporadas que puede tener el barco dado el mes
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

function formatPrice(n: number) { return n.toLocaleString('es-ES') + '€' }
function daysBetween(a: string, b: string) {
  if (!a || !b) return 1
  return Math.max(1, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1)
}

export default function NuevaReservaPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [boats, setBoats] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [extras, setExtras] = useState<any[]>([])
  const [allPricing, setAllPricing] = useState<any[]>([])
  const [staffUsers, setStaffUsers] = useState<any[]>([])
  const [captainId, setCaptainId] = useState<string>('')

  const [clientSearch, setClientSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [newClient, setNewClient] = useState(false)
  const [clientForm, setClientForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    nationality: '', boat_license: '', is_vip: false,
  })

  const [selectedBoat, setSelectedBoat] = useState<any>(null)
  const [rentalType, setRentalType] = useState<'with_captain' | 'bareboat'>('with_captain')

  // Tarifa seleccionada
  const [selectedTariff, setSelectedTariff] = useState<string>('patron_fuel')
  const [selectedDuration, setSelectedDuration] = useState<string>('full')
  const [selectedPricingRow, setSelectedPricingRow] = useState<any>(null)
  const [earlyBird, setEarlyBird] = useState(false)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('18:00')
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [departurePort, setDeparturePort] = useState('Club Náutico San Antonio')
  const [routeNotes, setRouteNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [source, setSource] = useState('direct')
  const [discount, setDiscount] = useState(0)
  const [depositAmount, setDepositAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [depositMethod, setDepositMethod] = useState<string>('cash')
  const [paymentLink, setPaymentLink] = useState('')
  const [depositLink, setDepositLink] = useState('')
  const [selectedExtras, setSelectedExtras] = useState<SelectedExtra[]>([])

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('boats').select('*').eq('status', 'available').order('name'),
      supabase.from('clients').select('*').order('last_name'),
      supabase.from('extras').select('*').eq('is_active', true).order('name'),
      supabase.from('boat_pricing').select('*'),
      supabase.from('staff_users').select('id,name,role').eq('active', true).order('name'),
    ]).then(([b, c, e, p, s]) => {
      setBoats(b.data ?? [])
      setClients(c.data ?? [])
      setExtras(e.data ?? [])
      setAllPricing(p.data ?? [])
      setStaffUsers(s.data ?? [])
    })
  }, [])

  // Al cambiar tipo de alquiler, resetear tarifa y fianza
  useEffect(() => {
    const defaults: Record<string, string> = {
      bareboat: 'sin_incluido',
      with_captain: 'patron_fuel',
    }
    setSelectedTariff(defaults[rentalType] ?? 'patron_fuel')
    setDepositAmount(rentalType === 'bareboat' ? 500 : 0)
  }, [rentalType])

  // Recalcular tarifa cuando cambia barco, fecha, tariff, duration
  useEffect(() => {
    if (!selectedBoat || !startDate) { setSelectedPricingRow(null); return }
    const candidates = getCandidateSeasons(startDate)
    const match = allPricing.find(r =>
      r.boat_id === selectedBoat.id &&
      candidates.includes(r.season) &&
      r.tariff === selectedTariff &&
      r.duration === selectedDuration
    )
    setSelectedPricingRow(match ?? null)
  }, [selectedBoat, startDate, selectedTariff, selectedDuration, allPricing])

  // Tarifas que corresponden a cada tipo de alquiler
  const TARIFFS_FOR_RENTAL: Record<string, string[]> = {
    bareboat:     ['sin_incluido'],
    with_captain: ['patron_fuel', 'es_vedra', 'formentera'],
  }

  // Tarifas disponibles: filtradas por barco + fecha + tipo de alquiler
  const availableTariffs = selectedBoat && startDate
    ? [...new Set(
        allPricing
          .filter(r =>
            r.boat_id === selectedBoat.id &&
            getCandidateSeasons(startDate).includes(r.season) &&
            TARIFFS_FOR_RENTAL[rentalType].includes(r.tariff)
          )
          .map(r => r.tariff)
      )]
    : []

  const availableDurations = selectedBoat && startDate && selectedTariff
    ? [...new Set(
        allPricing
          .filter(r =>
            r.boat_id === selectedBoat.id &&
            getCandidateSeasons(startDate).includes(r.season) &&
            r.tariff === selectedTariff
          )
          .map(r => r.duration)
      )]
    : []

  // Precio base: de la tabla si hay row, sino de full_day_rate del barco
  const rawBasePrice = selectedPricingRow
    ? Number(selectedPricingRow.price)
    : (selectedBoat ? Number(selectedBoat.full_day_rate ?? 0) : 0)

  const basePrice = earlyBird ? Math.round(rawBasePrice * 0.9) : rawBasePrice
  const fuelExtra = selectedPricingRow?.fuel_extra ? Number(selectedPricingRow.fuel_extra) : 0
  const extrasTotal = selectedExtras.reduce((s, e) => s + e.price * e.quantity, 0)
  const totalPrice = Math.max(0, basePrice + fuelExtra + extrasTotal - discount)

  const season = startDate ? getCandidateSeasons(startDate)[0] : ''

  const filteredClients = clients.filter(c => {
    const q = clientSearch.toLowerCase()
    return `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q)
  })

  function addExtra(extra: any) {
    setSelectedExtras(prev => {
      const ex = prev.find(e => e.id === extra.id)
      if (ex) return prev.map(e => e.id === extra.id ? { ...e, quantity: e.quantity + 1 } : e)
      return [...prev, { id: extra.id, name: extra.name, price: Number(extra.price), unit: extra.unit, quantity: 1 }]
    })
  }
  function removeExtra(id: string) { setSelectedExtras(prev => prev.filter(e => e.id !== id)) }
  function updateExtraQty(id: string, qty: number) {
    if (qty < 1) return removeExtra(id)
    setSelectedExtras(prev => prev.map(e => e.id === id ? { ...e, quantity: qty } : e))
  }

  async function handleSubmit() {
    setSaving(true); setError('')
    const supabase = createClient()
    try {
      let clientId = selectedClient?.id
      if (newClient) {
        const { data: nc, error: ce } = await supabase.from('clients').insert({
          first_name: clientForm.first_name,
          last_name: clientForm.last_name,
          email: clientForm.email || null,
          phone: clientForm.phone || null,
          nationality: clientForm.nationality || null,
          boat_license: clientForm.boat_license || null,
          is_vip: clientForm.is_vip,
        }).select().single()
        if (ce) throw new Error(`Error al crear cliente: ${ce.message}${ce.details ? ' — ' + ce.details : ''}${ce.hint ? ' (' + ce.hint + ')' : ''}`)
        if (!nc) throw new Error('No se pudo crear el cliente')
        clientId = nc.id
      }
      if (!clientId) throw new Error('Selecciona o crea un cliente')
      if (!selectedBoat?.id) throw new Error('Selecciona un barco')
      if (!startDate) throw new Error('Selecciona una fecha de salida')

      const bookingData = {
        client_id: clientId,
        boat_id: selectedBoat.id,
        rental_type: rentalType,
        captain_id: rentalType === 'with_captain' && captainId ? captainId : null,
        status: 'confirmed',
        start_date: startDate,
        end_date: endDate || startDate,
        start_time: startTime,
        end_time: endTime,
        adults,
        children,
        base_price: basePrice,
        extras_total: extrasTotal + fuelExtra,
        discount,
        total_price: totalPrice,
        deposit_amount: depositAmount,
        payment_status: 'pending',
        departure_port: departurePort,
        route_notes: routeNotes || null,
        internal_notes: [
          internalNotes,
          selectedPricingRow ? `Tarifa: ${TARIFF_INFO[selectedTariff]?.label} · ${SEASON_LABELS[season] ?? season} · ${selectedPricingRow.hours}` : '',
          earlyBird ? 'Descuento madrugadores 10%' : '',
          fuelExtra ? `Fuel extra: +${fuelExtra}€` : '',
          `Método pago: ${paymentMethod}`,
          paymentMethod === 'link' && paymentLink ? `Link pago: ${paymentLink}` : '',
          depositAmount > 0 ? `Método fianza: ${depositMethod}` : '',
          depositMethod === 'link' && depositLink ? `Link fianza: ${depositLink}` : '',
        ].filter(Boolean).join(' | ') || null,
        source,
      }

      const { data: booking, error: be } = await supabase
        .from('bookings').insert(bookingData).select().single()
      if (be) throw new Error(`Reserva: ${be.message} (${be.code})`)

      if (selectedExtras.length > 0) {
        const { error: ee } = await supabase.from('booking_extras').insert(
          selectedExtras.map(e => ({
            booking_id: booking.id, extra_id: e.id,
            name: e.name, quantity: e.quantity,
            unit_price: e.price, total: e.price * e.quantity,
          }))
        )
        if (ee) console.warn('Extras no guardados:', ee.message)
      }
      router.push(`/reservas/${booking.id}`)
    } catch (e: any) {
      setError(e.message ?? 'Error desconocido al guardar')
      setSaving(false)
    }
  }

  function canContinue() {
    if (step === 1) return selectedClient || (newClient && clientForm.first_name && clientForm.last_name)
    if (step === 2) return !!selectedBoat
    if (step === 3) return !!startDate && !!selectedTariff
    return true
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => step > s.n && setStep(s.n as Step)}
              className={`flex items-center gap-2 text-xs font-medium transition-colors ${step === s.n ? 'text-[#C9A84C]' : step > s.n ? 'text-gray-400 hover:text-white cursor-pointer' : 'text-gray-600 cursor-default'}`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${step === s.n ? 'bg-[#C9A84C] border-[#C9A84C] text-black' : step > s.n ? 'bg-[#2A2A2A] border-[#2A2A2A] text-gray-300' : 'bg-transparent border-[#2A2A2A] text-gray-600'}`}>
                {step > s.n ? <CheckCircle size={14} /> : s.n}
              </div>
              <span className="hidden sm:block">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-3 ${step > s.n ? 'bg-[#C9A84C]/30' : 'bg-[#2A2A2A]'}`} />}
          </div>
        ))}
      </div>

      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl">

        {/* ── PASO 1: CLIENTE ── */}
        {step === 1 && (
          <div className="p-6 space-y-4">
            <h2 className="text-white font-semibold text-base">¿Quién hace la reserva?</h2>
            <div className="flex gap-2">
              <button onClick={() => { setNewClient(false); setSelectedClient(null) }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${!newClient ? 'bg-[#C9A84C]/10 border-[#C9A84C]/40 text-[#C9A84C]' : 'border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                Cliente existente
              </button>
              <button onClick={() => { setNewClient(true); setSelectedClient(null) }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${newClient ? 'bg-[#C9A84C]/10 border-[#C9A84C]/40 text-[#C9A84C]' : 'border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                <Plus size={14} className="inline mr-1" /> Nuevo cliente
              </button>
            </div>

            {!newClient ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input value={clientSearch} onChange={e => setClientSearch(e.target.value)}
                    placeholder="Buscar por nombre, email o teléfono..."
                    className="w-full pl-9 pr-4 py-2.5 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A84C]/50" />
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1.5">
                  {filteredClients.map(c => (
                    <button key={c.id} onClick={() => setSelectedClient(c)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all ${selectedClient?.id === c.id ? 'bg-[#C9A84C]/10 border-[#C9A84C]/40' : 'border-[#2A2A2A] hover:border-[#C9A84C]/20 hover:bg-[#1E1E1E]'}`}>
                      <div className="w-9 h-9 rounded-full bg-[#2A2A2A] flex items-center justify-center text-[#C9A84C] text-xs font-bold flex-shrink-0">
                        {c.first_name[0]}{c.last_name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-white text-sm font-medium">{c.first_name} {c.last_name}</p>
                          {c.is_vip && <Star size={11} className="text-[#C9A84C] fill-[#C9A84C]" />}
                        </div>
                        <p className="text-gray-500 text-xs truncate">{c.email ?? ''}{c.phone ? ` · ${c.phone}` : ''}</p>
                      </div>
                      {selectedClient?.id === c.id && <CheckCircle size={16} className="text-[#C9A84C] ml-auto flex-shrink-0" />}
                    </button>
                  ))}
                  {filteredClients.length === 0 && <p className="text-gray-600 text-sm text-center py-6">No se encontraron clientes</p>}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { k: 'first_name', label: 'Nombre *', ph: '' },
                  { k: 'last_name',  label: 'Apellidos *', ph: '' },
                  { k: 'email',      label: 'Email', ph: '' },
                  { k: 'phone',      label: 'Teléfono', ph: '' },
                  { k: 'nationality',label: 'Nacionalidad', ph: '' },
                  { k: 'boat_license',label: 'Licencia navegación', ph: 'PER-2A, PNB...' },
                ].map(f => (
                  <div key={f.k}>
                    <label className="text-gray-400 text-xs mb-1.5 block">{f.label}</label>
                    <input value={(clientForm as any)[f.k]} onChange={e => setClientForm(p => ({ ...p, [f.k]: e.target.value }))}
                      placeholder={f.ph}
                      className="w-full px-3 py-2.5 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A84C]/50" />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={clientForm.is_vip} onChange={e => setClientForm(p => ({ ...p, is_vip: e.target.checked }))} className="w-4 h-4 accent-[#C9A84C]" />
                    <span className="text-gray-400 text-sm flex items-center gap-1.5"><Star size={13} className="text-[#C9A84C]" /> Marcar como VIP</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PASO 2: BARCO ── */}
        {step === 2 && (
          <div className="p-6 space-y-4">
            <h2 className="text-white font-semibold text-base">Selecciona el barco</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {boats.map(boat => (
                <button key={boat.id} onClick={() => { setSelectedBoat(boat); if (boat.captain_required) setRentalType('with_captain') }}
                  className={`text-left p-4 rounded-xl border transition-all ${selectedBoat?.id === boat.id ? 'bg-[#C9A84C]/10 border-[#C9A84C]/50' : 'border-[#2A2A2A] hover:border-[#C9A84C]/20 hover:bg-[#1E1E1E]'}`}>
                  {boat.image_url && (
                    <img src={boat.image_url} alt={boat.name} className="w-full h-24 object-cover rounded-lg mb-3" />
                  )}
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="text-white font-semibold text-sm">{boat.name}</p>
                      <p className="text-gray-500 text-xs">{boat.model ?? boat.type}</p>
                    </div>
                    {selectedBoat?.id === boat.id && <CheckCircle size={16} className="text-[#C9A84C] flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    <span>{boat.capacity} pax</span>
                    {boat.length_meters && <span>{boat.length_meters}m</span>}
                    {boat.captain_required && <span className="text-[#C9A84C]">Solo con capitán</span>}
                  </div>
                </button>
              ))}
            </div>
            {selectedBoat && !selectedBoat.captain_required && (
              <div>
                <p className="text-gray-400 text-xs mb-2">Tipo de alquiler</p>
                <div className="flex gap-2">
                  {(['with_captain', 'bareboat'] as const).map(t => (
                    <button key={t} onClick={() => setRentalType(t)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${rentalType === t ? 'bg-[#C9A84C]/10 border-[#C9A84C]/40 text-[#C9A84C]' : 'border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                      {t === 'with_captain' ? '🧑‍✈️ Con capitán' : '🎯 Sin capitán'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Selector de capitán — visible cuando se va con capitán */}
            {rentalType === 'with_captain' && staffUsers.length > 0 && (
              <div>
                <p className="text-gray-400 text-xs mb-2">Capitán asignado</p>
                <select
                  value={captainId}
                  onChange={e => setCaptainId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-sm text-white focus:outline-none focus:border-[#C9A84C]/50">
                  <option value="">— Sin asignar —</option>
                  {staffUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} · {u.role}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* ── PASO 3: TARIFA + FECHAS ── */}
        {step === 3 && (
          <div className="p-6 space-y-5">
            <h2 className="text-white font-semibold text-base">Fecha y tarifa</h2>

            {/* Fechas primero para calcular temporada */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Fecha salida *</label>
                <input type="date" value={startDate}
                  onChange={e => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value) }}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2.5 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-sm text-white focus:outline-none focus:border-[#C9A84C]/50" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Fecha regreso</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full px-3 py-2.5 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-sm text-white focus:outline-none focus:border-[#C9A84C]/50" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block flex items-center gap-1"><Clock size={11} /> Hora salida</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-sm text-white focus:outline-none focus:border-[#C9A84C]/50" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block flex items-center gap-1"><Clock size={11} /> Hora regreso</label>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-sm text-white focus:outline-none focus:border-[#C9A84C]/50" />
              </div>
            </div>

            {/* Pax + puerto */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Adultos</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setAdults(Math.max(1, adults - 1))} className="w-8 h-8 rounded-lg bg-[#1E1E1E] border border-[#2A2A2A] text-white hover:border-[#C9A84C]/40">−</button>
                  <span className="text-white font-semibold w-5 text-center">{adults}</span>
                  <button onClick={() => setAdults(Math.min(selectedBoat?.capacity ?? 20, adults + 1))} className="w-8 h-8 rounded-lg bg-[#1E1E1E] border border-[#2A2A2A] text-white hover:border-[#C9A84C]/40">+</button>
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Niños</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setChildren(Math.max(0, children - 1))} className="w-8 h-8 rounded-lg bg-[#1E1E1E] border border-[#2A2A2A] text-white hover:border-[#C9A84C]/40">−</button>
                  <span className="text-white font-semibold w-5 text-center">{children}</span>
                  <button onClick={() => setChildren(children + 1)} className="w-8 h-8 rounded-lg bg-[#1E1E1E] border border-[#2A2A2A] text-white hover:border-[#C9A84C]/40">+</button>
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Origen</label>
                <select value={source} onChange={e => setSource(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-sm text-white focus:outline-none focus:border-[#C9A84C]/50">
                  {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Puerto de salida</label>
                <input value={departurePort} onChange={e => setDeparturePort(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-sm text-white focus:outline-none focus:border-[#C9A84C]/50" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Ruta / destino</label>
                <input value={routeNotes} onChange={e => setRouteNotes(e.target.value)}
                  placeholder="Formentera, Es Vedrà, Norte..."
                  className="w-full px-3 py-2.5 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A84C]/50" />
              </div>
            </div>

            {/* Tarifa */}
            {startDate && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-gray-400 text-xs font-medium">Tarifa contratada</p>
                  {season && <span className="text-[#C9A84C] text-xs bg-[#C9A84C]/10 px-2 py-0.5 rounded-full">Temporada: {SEASON_LABELS[season] ?? season}</span>}
                </div>

                {availableTariffs.length === 0 && (
                  <div className="flex items-center gap-2 text-yellow-400 text-xs bg-yellow-400/5 border border-yellow-400/20 rounded-lg px-3 py-2">
                    <Info size={13} /> No hay tarifas configuradas para este barco y mes. Se usará el precio base.
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2">
                  {(availableTariffs.length > 0 ? availableTariffs : Object.keys(TARIFF_INFO)).map(t => {
                    const info = TARIFF_INFO[t]
                    if (!info) return null
                    return (
                      <button key={t} onClick={() => setSelectedTariff(t)}
                        className={`text-left p-3 rounded-lg border transition-all ${selectedTariff === t ? 'bg-[#1E1E1E] border-[#C9A84C]/40' : 'border-[#2A2A2A] hover:border-[#2A2A2A] hover:bg-[#1A1A1A]'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm font-medium ${info.color}`}>{info.label}</p>
                            <p className="text-gray-600 text-xs mt-0.5">{info.desc}</p>
                          </div>
                          {selectedTariff === t && <CheckCircle size={15} className="text-[#C9A84C] flex-shrink-0" />}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Duración */}
                {availableDurations.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-xs mb-2">Duración</p>
                    <div className="flex gap-2">
                      {availableDurations.map(d => {
                        const row = allPricing.find(r =>
                          r.boat_id === selectedBoat?.id &&
                          getCandidateSeasons(startDate).includes(r.season) &&
                          r.tariff === selectedTariff &&
                          r.duration === d
                        )
                        return (
                          <button key={d} onClick={() => setSelectedDuration(d)}
                            className={`flex-1 py-2.5 px-3 rounded-lg text-sm border transition-all ${selectedDuration === d ? 'bg-[#C9A84C]/10 border-[#C9A84C]/40 text-[#C9A84C]' : 'border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                            <span className="font-medium">{DURATION_INFO[d]?.label ?? d}</span>
                            {row && <span className="text-xs ml-2 opacity-70">({row.hours})</span>}
                            {row && <span className="block text-sm font-bold mt-0.5">{Number(row.price).toLocaleString('es-ES')}€</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Madrugadores */}
                <label className="flex items-center gap-2 cursor-pointer p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] hover:border-[#C9A84C]/20 transition-colors">
                  <input type="checkbox" checked={earlyBird} onChange={e => setEarlyBird(e.target.checked)} className="w-4 h-4 accent-[#C9A84C]" />
                  <div>
                    <p className="text-gray-300 text-sm font-medium">Especial madrugadores <span className="text-green-400">−10%</span></p>
                    <p className="text-gray-600 text-xs">Consultar disponibilidad y horario</p>
                  </div>
                </label>

                {/* Preview precio */}
                {selectedPricingRow && (
                  <div className="bg-[#1E1E1E] rounded-lg px-4 py-3 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Precio tarifa</span>
                      <span className={earlyBird ? 'line-through text-gray-600' : 'text-white font-semibold'}>{Number(selectedPricingRow.price).toLocaleString('es-ES')}€</span>
                    </div>
                    {earlyBird && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Con descuento 10%</span>
                        <span className="text-green-400 font-semibold">{basePrice.toLocaleString('es-ES')}€</span>
                      </div>
                    )}
                    {fuelExtra > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Combustible extra</span>
                        <span className="text-white">+{fuelExtra}€</span>
                      </div>
                    )}
                    <div className="border-t border-[#2A2A2A] pt-1.5 flex justify-between font-bold">
                      <span className="text-gray-300">Subtotal</span>
                      <span className="text-[#C9A84C]">{(basePrice + fuelExtra).toLocaleString('es-ES')}€</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Notas internas</label>
              <textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} rows={2}
                placeholder="Solo visible para el equipo..."
                className="w-full px-3 py-2.5 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A84C]/50 resize-none" />
            </div>
          </div>
        )}

        {/* ── PASO 4: EXTRAS ── */}
        {step === 4 && (
          <div className="p-6 space-y-4">
            <h2 className="text-white font-semibold text-base">Extras y servicios</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {extras.map(extra => {
                const sel = selectedExtras.find(e => e.id === extra.id)
                return (
                  <div key={extra.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${sel ? 'bg-[#C9A84C]/5 border-[#C9A84C]/30' : 'border-[#2A2A2A]'}`}>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium">{extra.name}</p>
                      <p className="text-[#C9A84C] text-xs">{Number(extra.price) === 0 ? 'Variable' : `${Number(extra.price)}€ / ${extra.unit}`}</p>
                    </div>
                    {sel ? (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => updateExtraQty(extra.id, sel.quantity - 1)} className="w-6 h-6 rounded bg-[#2A2A2A] text-white text-xs hover:bg-[#3A3A3A]">−</button>
                        <span className="text-white text-sm w-4 text-center">{sel.quantity}</span>
                        <button onClick={() => updateExtraQty(extra.id, sel.quantity + 1)} className="w-6 h-6 rounded bg-[#2A2A2A] text-white text-xs hover:bg-[#3A3A3A]">+</button>
                        <button onClick={() => removeExtra(extra.id)} className="w-6 h-6 rounded bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30 ml-1"><X size={12} /></button>
                      </div>
                    ) : (
                      <button onClick={() => addExtra(extra)} className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#2A2A2A] text-[#C9A84C] flex items-center justify-center hover:bg-[#C9A84C]/20 transition-colors">
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            {selectedExtras.length > 0 && (
              <div className="bg-[#1E1E1E] rounded-lg p-3 space-y-1.5">
                {selectedExtras.map(e => (
                  <div key={e.id} className="flex justify-between text-sm">
                    <span className="text-gray-400">{e.name} × {e.quantity}</span>
                    <span className="text-white">{formatPrice(e.price * e.quantity)}</span>
                  </div>
                ))}
                <div className="border-t border-[#2A2A2A] pt-1.5 flex justify-between text-sm font-semibold">
                  <span className="text-gray-300">Total extras</span>
                  <span className="text-[#C9A84C]">{formatPrice(extrasTotal)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PASO 5: RESUMEN ── */}
        {step === 5 && (
          <div className="p-6 space-y-4">
            <h2 className="text-white font-semibold text-base">Resumen de la reserva</h2>
            <div className="space-y-3">

              {/* Cliente */}
              <div className="bg-[#1E1E1E] rounded-lg p-4">
                <p className="text-gray-500 text-xs mb-2">CLIENTE</p>
                {selectedClient
                  ? <><p className="text-white font-medium">{selectedClient.first_name} {selectedClient.last_name}</p><p className="text-gray-500 text-xs">{selectedClient.email}{selectedClient.phone ? ` · ${selectedClient.phone}` : ''}</p></>
                  : <><p className="text-white font-medium">{clientForm.first_name} {clientForm.last_name} <span className="text-[#C9A84C] text-xs">(nuevo)</span></p><p className="text-gray-500 text-xs">{clientForm.email}</p></>
                }
              </div>

              {/* Barco + tarifa */}
              <div className="bg-[#1E1E1E] rounded-lg p-4">
                <p className="text-gray-500 text-xs mb-2">BARCO Y TARIFA</p>
                <p className="text-white font-medium">{selectedBoat?.name}</p>
                <p className="text-gray-500 text-xs">
                  {TARIFF_INFO[selectedTariff]?.label} · {DURATION_INFO[selectedDuration]?.label}
                  {selectedPricingRow?.hours ? ` (${selectedPricingRow.hours})` : ''}
                  {earlyBird ? ' · Madrugadores −10%' : ''}
                </p>
                {season && <p className="text-[#C9A84C] text-xs mt-0.5">Temporada: {SEASON_LABELS[season] ?? season}</p>}
              </div>

              {/* Fecha */}
              <div className="bg-[#1E1E1E] rounded-lg p-4">
                <p className="text-gray-500 text-xs mb-2">FECHA</p>
                <p className="text-white font-medium">
                  {startDate ? new Date(startDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                  {endDate && endDate !== startDate && ` → ${new Date(endDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })}`}
                </p>
                <p className="text-gray-500 text-xs">{startTime} → {endTime} · {adults} adultos{children > 0 ? ` · ${children} niños` : ''} · {departurePort}</p>
                {routeNotes && <p className="text-gray-500 text-xs">Ruta: {routeNotes}</p>}
              </div>

              {/* Desglose precio */}
              <div className="bg-[#1E1E1E] rounded-lg p-4 space-y-2">
                <p className="text-gray-500 text-xs mb-1">DESGLOSE DE PRECIO</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Tarifa base{earlyBird ? ' (−10%)' : ''}</span>
                  <span className="text-white">{formatPrice(basePrice)}</span>
                </div>
                {fuelExtra > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Combustible extra</span>
                    <span className="text-white">+{formatPrice(fuelExtra)}</span>
                  </div>
                )}
                {selectedExtras.map(e => (
                  <div key={e.id} className="flex justify-between text-sm">
                    <span className="text-gray-400">{e.name} × {e.quantity}</span>
                    <span className="text-white">{formatPrice(e.price * e.quantity)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Descuento adicional</span>
                  <div className="flex items-center gap-1">
                    <input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} min={0}
                      className="w-20 px-2 py-1 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-white text-right text-sm focus:outline-none" />
                    <span className="text-gray-400 text-xs">€</span>
                  </div>
                </div>
                <div className="border-t border-[#2A2A2A] pt-2 flex justify-between font-bold text-base">
                  <span className="text-white">TOTAL</span>
                  <span className="text-[#C9A84C] text-xl">{formatPrice(totalPrice)}</span>
                </div>
              </div>

              {/* Método de pago + fianza */}
              <div className="bg-[#1E1E1E] rounded-lg p-4 space-y-4">
                <p className="text-gray-500 text-xs">PAGO Y FIANZA</p>

                {/* Pago total */}
                <div className="space-y-2">
                  <label className="text-gray-400 text-xs block">Método de pago del total</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'cash',     label: '💵 Efectivo' },
                      { value: 'card',     label: '💳 Tarjeta' },
                      { value: 'transfer', label: '🏦 Transferencia' },
                      { value: 'bizum',    label: '📱 Bizum' },
                      { value: 'link',     label: '🔗 Link de pago' },
                    ].map(m => (
                      <button key={m.value} onClick={() => setPaymentMethod(m.value)}
                        className={`py-2.5 px-3 rounded-lg text-sm border transition-all text-left ${paymentMethod === m.value ? 'bg-[#C9A84C]/10 border-[#C9A84C]/50 text-white font-medium' : 'border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {paymentMethod === 'link' && (
                    <input type="url" value={paymentLink} onChange={e => setPaymentLink(e.target.value)}
                      placeholder="https://pay.sumup.com/... o Stripe link"
                      className="w-full px-3 py-2 bg-[#141414] border border-[#C9A84C]/30 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A84C]/60" />
                  )}
                </div>

                {/* Fianza */}
                <div className="border-t border-[#2A2A2A] pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-300 text-sm font-medium">Fianza</p>
                      <p className="text-gray-600 text-xs">{rentalType === 'bareboat' ? 'Requerida (sin patrón)' : 'Opcional'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" value={depositAmount} onChange={e => setDepositAmount(Number(e.target.value))} min={0}
                        className="w-24 px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white text-right text-sm font-semibold focus:outline-none focus:border-[#C9A84C]/50" />
                      <span className="text-gray-400 text-sm">€</span>
                    </div>
                  </div>
                  {depositAmount > 0 && (
                    <div className="space-y-2">
                      <label className="text-gray-400 text-xs block">Método de cobro de la fianza</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 'cash',     label: '💵 Efectivo' },
                          { value: 'card',     label: '💳 Tarjeta' },
                          { value: 'transfer', label: '🏦 Transferencia' },
                          { value: 'bizum',    label: '📱 Bizum' },
                          { value: 'link',     label: '🔗 Link de pago' },
                        ].map(m => (
                          <button key={m.value} onClick={() => setDepositMethod(m.value)}
                            className={`py-2.5 px-3 rounded-lg text-sm border transition-all text-left ${depositMethod === m.value ? 'bg-[#C9A84C]/10 border-[#C9A84C]/50 text-white font-medium' : 'border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                            {m.label}
                          </button>
                        ))}
                      </div>
                      {depositMethod === 'link' && (
                        <input type="url" value={depositLink} onChange={e => setDepositLink(e.target.value)}
                          placeholder="Link de pago para la fianza"
                          className="w-full px-3 py-2 bg-[#141414] border border-[#C9A84C]/30 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A84C]/60" />
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm font-mono">{error}</div>
            )}
          </div>
        )}

        {/* Navegación */}
        <div className="px-6 py-4 border-t border-[#2A2A2A] flex items-center justify-between">
          <button onClick={() => step > 1 ? setStep((step - 1) as Step) : router.back()}
            className="flex items-center gap-2 px-4 py-2 border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-[#C9A84C]/30 rounded-lg text-sm transition-all">
            <ChevronLeft size={16} /> {step === 1 ? 'Cancelar' : 'Atrás'}
          </button>
          {step < 5 ? (
            <button onClick={() => canContinue() && setStep((step + 1) as Step)} disabled={!canContinue()}
              className="flex items-center gap-2 px-5 py-2 bg-[#C9A84C] hover:bg-[#E8C97A] disabled:opacity-40 disabled:cursor-not-allowed text-black text-sm font-semibold rounded-lg transition-all">
              Siguiente <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-[#C9A84C] hover:bg-[#E8C97A] disabled:opacity-60 text-black text-sm font-semibold rounded-lg transition-all">
              {saving ? <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> Guardando...</> : <><CheckCircle size={16} /> Confirmar reserva</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
