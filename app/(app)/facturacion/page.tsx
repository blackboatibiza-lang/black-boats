'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import {
  FileText, Plus, Search, Printer, Trash2, CheckCircle,
  X, TrendingUp, Clock, Receipt,
} from 'lucide-react'

interface InvoiceLine {
  id: string
  description: string
  qty: number
  unitPrice: number
}

function genInvoiceNumber() {
  const now = new Date()
  return `BB-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 900 + 100)}`
}

function uid() { return Math.random().toString(36).slice(2, 9) }

function calcPaidAmount(b: any): number {
  const notes: string = b.internal_notes ?? ''
  const payLine = notes.split(' | ').find((p: string) =>
    /cash|card|transfer|bizum|link/i.test(p) && !p.toLowerCase().startsWith('método fianza') && !p.toLowerCase().startsWith('link fianza')
  )
  if (payLine) {
    const amounts = payLine.match(/[\d.]+(?=€)/g)
    if (amounts?.length) return amounts.reduce((s: number, n: string) => s + parseFloat(n), 0)
    const single = payLine.match(/:\s*([\d.]+)/)
    if (single) return parseFloat(single[1])
  }
  return 0
}

function payStatus(b: any): { label: string; color: string; pending: number } {
  const paid = calcPaidAmount(b)
  const total = Number(b.total_price ?? 0)
  if (paid <= 0) return { label: 'Sin pagar', color: 'text-red-400', pending: total }
  if (paid >= total) return { label: 'Pagado', color: 'text-green-500', pending: 0 }
  return { label: `Falta ${(total - paid).toLocaleString('es-ES')}€`, color: 'text-yellow-500', pending: total - paid }
}

// ── INVOICE MODAL ─────────────────────────────────────────────────
function InvoiceModal({ booking, onClose }: { booking: any; onClose: () => void }) {
  // Emisor
  const [emisorNombre, setEmisorNombre] = useState('Black Boats Ibiza S.L.')
  const [emisorNif,    setEmisorNif]    = useState('B-XXXXXXXX')
  const [emisorDir,    setEmisorDir]    = useState('Puerto Deportivo San Antonio, Local 5, 07820 Ibiza')
  const [emisorTel,    setEmisorTel]    = useState('+34 971 000 000')
  const [emisorEmail,  setEmisorEmail]  = useState('info@blackboatsibiza.com')
  const [emisorIban,   setEmisorIban]   = useState('ES00 0000 0000 0000 0000 0000')

  // Factura
  const [invoiceNum,  setInvoiceNum]  = useState(genInvoiceNumber)
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate,     setDueDate]     = useState('')
  const [applyTax,    setApplyTax]    = useState(false)
  const [notes,       setNotes]       = useState('Gracias por confiar en Black Boats Ibiza.')

  // Cliente
  const c = booking?.client
  const [clientNombre, setClientNombre] = useState(c ? `${c.first_name} ${c.last_name}` : '')
  const [clientNif,    setClientNif]    = useState(c?.nif ?? '')
  const [clientDir,    setClientDir]    = useState(c?.address ?? '')
  const [clientEmail,  setClientEmail]  = useState(c?.email ?? '')

  // Líneas
  const [lines, setLines] = useState<InvoiceLine[]>(() => {
    const l: InvoiceLine[] = [{
      id: uid(),
      description: `Alquiler ${booking?.boat?.name ?? ''}${booking?.start_date ? ' — ' + new Date(booking.start_date).toLocaleDateString('es-ES') : ''}${booking?.start_date !== booking?.end_date && booking?.end_date ? ' al ' + new Date(booking.end_date).toLocaleDateString('es-ES') : ''}`,
      qty: 1,
      unitPrice: Number(booking?.base_price ?? 0),
    }]
    if (Number(booking?.extras_total) > 0)
      l.push({ id: uid(), description: 'Extras y servicios adicionales', qty: 1, unitPrice: Number(booking.extras_total) })
    if (Number(booking?.discount) > 0)
      l.push({ id: uid(), description: 'Descuento aplicado', qty: 1, unitPrice: -Number(booking.discount) })
    return l
  })

  function updateLine(id: string, field: keyof InvoiceLine, val: string | number) {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: val } : l))
  }

  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const tax      = applyTax ? subtotal * 0.21 : 0
  const total    = subtotal + tax

  const f2 = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 overflow-y-auto py-6 px-4">
      <div className="w-full max-w-4xl space-y-3">

        {/* Toolbar */}
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3">
          <div className="flex items-center gap-3">
            <FileText size={15} className="text-[#C9A84C]" />
            <span className="text-gray-900 font-semibold text-sm">Editor de factura</span>
            <span className="text-gray-700 text-xs">· todos los campos son editables</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
              <input type="checkbox" checked={applyTax} onChange={e => setApplyTax(e.target.checked)} className="w-3.5 h-3.5 accent-[#C9A84C]" />
              IVA 21%
            </label>
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 hover:bg-[#3A3A3A] text-gray-900 text-xs rounded-lg transition-colors">
              <Printer size={13} /> Imprimir / PDF
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-700 hover:text-gray-900">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* DOCUMENTO */}
        <div className="bg-white rounded-xl overflow-hidden shadow-2xl" id="invoice-doc">

          {/* Cabecera negra */}
          <div className="bg-white px-8 py-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-[#C9A84C] flex items-center justify-center">
                    <span className="text-black font-bold text-[10px]">BB</span>
                  </div>
                  <span className="text-gray-900 font-bold tracking-widest uppercase text-sm">Black Boats</span>
                  <span className="text-[#C9A84C] text-xs tracking-wider">Ibiza</span>
                </div>
                <div className="space-y-0.5">
                  <input value={emisorNombre} onChange={e => setEmisorNombre(e.target.value)}
                    className="bg-transparent text-gray-900 font-semibold text-sm focus:outline-none border-b border-transparent hover:border-[#C9A84C]/20 focus:border-[#C9A84C]/50 w-full" />
                  <input value={emisorNif} onChange={e => setEmisorNif(e.target.value)}
                    className="bg-transparent text-gray-700 text-xs focus:outline-none border-b border-transparent hover:border-[#C9A84C]/20 focus:border-[#C9A84C]/50 w-full" placeholder="NIF/CIF" />
                  <input value={emisorDir} onChange={e => setEmisorDir(e.target.value)}
                    className="bg-transparent text-gray-700 text-xs focus:outline-none border-b border-transparent hover:border-[#C9A84C]/20 focus:border-[#C9A84C]/50 w-full" />
                  <input value={emisorTel} onChange={e => setEmisorTel(e.target.value)}
                    className="bg-transparent text-gray-700 text-xs focus:outline-none border-b border-transparent hover:border-[#C9A84C]/20 focus:border-[#C9A84C]/50 w-44" />
                  <input value={emisorEmail} onChange={e => setEmisorEmail(e.target.value)}
                    className="bg-transparent text-gray-700 text-xs focus:outline-none border-b border-transparent hover:border-[#C9A84C]/20 focus:border-[#C9A84C]/50 w-full" />
                </div>
              </div>
              <div className="text-right">
                <p className="text-[#C9A84C] text-3xl font-bold tracking-tight mb-3">FACTURA</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-end gap-3 text-xs">
                    <span className="text-gray-700">Nº</span>
                    <input value={invoiceNum} onChange={e => setInvoiceNum(e.target.value)}
                      className="bg-transparent text-gray-900 font-mono font-bold text-right focus:outline-none border-b border-transparent hover:border-[#C9A84C]/20 focus:border-[#C9A84C]/50 w-52" />
                  </div>
                  <div className="flex items-center justify-end gap-3 text-xs">
                    <span className="text-gray-700">Fecha</span>
                    <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                      className="bg-transparent text-gray-900 text-right focus:outline-none border-b border-transparent hover:border-[#C9A84C]/20 focus:border-[#C9A84C]/50 w-36" />
                  </div>
                  <div className="flex items-center justify-end gap-3 text-xs">
                    <span className="text-gray-700">Vence</span>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                      className="bg-transparent text-gray-900 text-right focus:outline-none border-b border-transparent hover:border-[#C9A84C]/20 focus:border-[#C9A84C]/50 w-36" />
                  </div>
                  {booking?.booking_number && (
                    <div className="flex items-center justify-end gap-3 text-xs">
                      <span className="text-gray-700">Reserva</span>
                      <span className="text-[#C9A84C] font-mono">{booking.booking_number}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Datos cliente */}
          <div className="px-8 py-5 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-gray-700 text-[10px] uppercase tracking-wider font-semibold mb-2">Facturado a</p>
                <div className="space-y-1">
                  <input value={clientNombre} onChange={e => setClientNombre(e.target.value)}
                    placeholder="Nombre / Empresa"
                    className="text-gray-900 font-semibold text-sm focus:outline-none border-b border-transparent hover:border-gray-300 focus:border-gray-500 w-full bg-transparent" />
                  <input value={clientNif} onChange={e => setClientNif(e.target.value)}
                    placeholder="NIF / CIF / Pasaporte"
                    className="text-gray-700 text-xs focus:outline-none border-b border-transparent hover:border-gray-300 focus:border-gray-500 w-full bg-transparent" />
                  <input value={clientDir} onChange={e => setClientDir(e.target.value)}
                    placeholder="Dirección"
                    className="text-gray-700 text-xs focus:outline-none border-b border-transparent hover:border-gray-300 focus:border-gray-500 w-full bg-transparent" />
                  <input value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                    placeholder="Email"
                    className="text-gray-700 text-xs focus:outline-none border-b border-transparent hover:border-gray-300 focus:border-gray-500 w-full bg-transparent" />
                </div>
              </div>
              {booking?.boat && (
                <div className="text-right">
                  <p className="text-gray-700 text-[10px] uppercase tracking-wider font-semibold mb-2">Servicio prestado</p>
                  <p className="text-gray-700 text-sm font-medium">{booking.boat.name}</p>
                  <p className="text-gray-700 text-xs">{booking.rental_type === 'with_captain' ? 'Con capitán' : 'Sin capitán'}</p>
                  {booking.start_date && (
                    <p className="text-gray-700 text-xs mt-1">
                      {new Date(booking.start_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                      {booking.start_date !== booking.end_date && ` — ${new Date(booking.end_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })}`}
                    </p>
                  )}
                  {booking.departure_port && <p className="text-gray-700 text-xs">{booking.departure_port}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Líneas */}
          <div className="px-8 py-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-900">
                  <th className="text-left pb-2 text-gray-700 text-xs uppercase tracking-wider font-semibold">Descripción</th>
                  <th className="text-center pb-2 text-gray-700 text-xs uppercase tracking-wider font-semibold w-16">Uds.</th>
                  <th className="text-right pb-2 text-gray-700 text-xs uppercase tracking-wider font-semibold w-28">Precio unit.</th>
                  <th className="text-right pb-2 text-gray-700 text-xs uppercase tracking-wider font-semibold w-28">Total</th>
                  <th className="w-7" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={line.id} className={`border-b border-gray-100 ${i % 2 !== 0 ? 'bg-gray-50' : ''}`}>
                    <td className="py-2.5 pr-4">
                      <input value={line.description} onChange={e => updateLine(line.id, 'description', e.target.value)}
                        className="text-gray-800 text-sm focus:outline-none border-b border-transparent hover:border-gray-300 focus:border-gray-500 w-full bg-transparent" />
                    </td>
                    <td className="py-2.5 text-center">
                      <input type="number" value={line.qty} onChange={e => updateLine(line.id, 'qty', Number(e.target.value))}
                        className="text-gray-700 text-sm text-center focus:outline-none border-b border-transparent hover:border-gray-300 focus:border-gray-500 w-12 bg-transparent" />
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="inline-flex items-center gap-0.5">
                        <input type="number" value={line.unitPrice} onChange={e => updateLine(line.id, 'unitPrice', Number(e.target.value))}
                          className="text-gray-700 text-sm text-right focus:outline-none border-b border-transparent hover:border-gray-300 focus:border-gray-500 w-20 bg-transparent" />
                        <span className="text-gray-700 text-xs">€</span>
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <span className={`text-sm font-semibold ${line.qty * line.unitPrice < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {f2(line.qty * line.unitPrice)}€
                      </span>
                    </td>
                    <td className="py-2.5 pl-2">
                      <button onClick={() => setLines(prev => prev.filter(l => l.id !== line.id))}
                        className="text-gray-200 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setLines(prev => [...prev, { id: uid(), description: '', qty: 1, unitPrice: 0 }])}
              className="mt-2 flex items-center gap-1.5 text-xs text-gray-700 hover:text-gray-700 transition-colors">
              <Plus size={12} /> Añadir línea
            </button>

            {/* Totales */}
            <div className="mt-6 flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900">{f2(subtotal)}€</span>
                </div>
                {applyTax && (
                  <div className="flex justify-between text-gray-700">
                    <span>IVA (21%)</span>
                    <span>{f2(tax)}€</span>
                  </div>
                )}
                <div className="flex justify-between border-t-2 border-gray-900 pt-2 font-bold text-base">
                  <span className="text-gray-900">TOTAL</span>
                  <span className="text-gray-900">{f2(total)}€</span>
                </div>
              </div>
            </div>
          </div>

          {/* Banco + notas */}
          <div className="px-8 py-5 bg-gray-50 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-gray-700 text-[10px] uppercase tracking-wider font-semibold mb-2">Datos bancarios</p>
                <input value={emisorIban} onChange={e => setEmisorIban(e.target.value)}
                  className="text-gray-700 text-xs font-mono focus:outline-none border-b border-transparent hover:border-gray-300 focus:border-gray-500 w-full bg-transparent" />
                <p className="text-gray-700 text-[10px] mt-1">Concepto: {invoiceNum}</p>
              </div>
              <div>
                <p className="text-gray-700 text-[10px] uppercase tracking-wider font-semibold mb-2">Notas</p>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="text-gray-700 text-xs focus:outline-none border-b border-transparent hover:border-gray-300 focus:border-gray-500 w-full bg-transparent resize-none" />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-3 bg-white text-center">
            <p className="text-gray-700 text-[10px]">
              {emisorNombre} · {emisorNif} · {emisorDir}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────
export default function FacturacionPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [tab, setTab]           = useState<'facturas' | 'pagos'>('facturas')
  const [selectedBooking, setSelectedBooking] = useState<any>(null)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('bookings')
        .select('*, client:clients(first_name,last_name,email,address), boat:boats(name)')
        .neq('status', 'cancelled')
        .order('start_date', { ascending: false }),
      supabase.from('payments')
        .select('*, booking:bookings(booking_number, client:clients(first_name,last_name))')
        .order('payment_date', { ascending: false }),
    ]).then(([{ data: bk }, { data: py }]) => {
      setBookings(bk ?? [])
      setPayments(py ?? [])
      setLoading(false)
    })
  }, [])

  const filteredBookings = bookings.filter(b => {
    const q = search.toLowerCase()
    const name = b.client ? `${b.client.first_name} ${b.client.last_name}` : ''
    return name.toLowerCase().includes(q) ||
      (b.boat?.name ?? '').toLowerCase().includes(q) ||
      b.booking_number.toLowerCase().includes(q)
  })

  const totalFacturado = bookings.reduce((s, b) => s + Number(b.total_price ?? 0), 0)
  const totalCobrado   = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0)
  const pendiente      = bookings.filter(b => payStatus(b).pending > 0).length

  const methodLabels: Record<string, string> = { card: 'Tarjeta', transfer: 'Transferencia', cash: 'Efectivo', bizum: 'Bizum', link: 'Link de pago' }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: TrendingUp, color: 'text-[#C9A84C]', bg: 'bg-[#C9A84C]/10', label: 'Total facturado', value: `${totalFacturado.toLocaleString('es-ES')}€` },
          { icon: CheckCircle, color: 'text-green-400',  bg: 'bg-green-400/10',  label: 'Total cobrado',    value: `${totalCobrado.toLocaleString('es-ES')}€` },
          { icon: Clock,       color: 'text-red-400',    bg: 'bg-red-400/10',    label: 'Pendientes de cobro', value: String(pendiente) },
        ].map(k => (
          <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center`}>
                <k.icon size={16} className={k.color} />
              </div>
              <span className="text-gray-700 text-xs">{k.label}</span>
            </div>
            <p className="text-gray-900 text-2xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('facturas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'facturas' ? 'bg-[#C9A84C] text-black' : 'text-gray-700 hover:text-gray-900'}`}>
          <FileText size={14} /> Emitir factura
        </button>
        <button onClick={() => setTab('pagos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'pagos' ? 'bg-[#C9A84C] text-black' : 'text-gray-700 hover:text-gray-900'}`}>
          <Receipt size={14} /> Historial de pagos
        </button>
      </div>

      {/* TAB FACTURAS */}
      {tab === 'facturas' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <p className="text-gray-900 font-semibold text-sm">Selecciona una reserva para generar su factura</p>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="pl-8 pr-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C9A84C]/50 w-44" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-5 py-3 text-gray-700 font-medium text-xs">Reserva</th>
                  <th className="text-left px-5 py-3 text-gray-700 font-medium text-xs">Cliente</th>
                  <th className="text-left px-5 py-3 text-gray-700 font-medium text-xs">Barco</th>
                  <th className="text-left px-5 py-3 text-gray-700 font-medium text-xs">Fecha</th>
                  <th className="text-right px-5 py-3 text-gray-700 font-medium text-xs">Total</th>
                  <th className="text-left px-5 py-3 text-gray-700 font-medium text-xs">Pago</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBookings.map(b => {
                  const clientName = b.client ? `${b.client.first_name} ${b.client.last_name}` : 'Sin cliente'
                  return (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="text-[#C9A84C] font-mono text-xs">{b.booking_number}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[#C9A84C] text-xs font-bold flex-shrink-0">
                            {clientName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </div>
                          <span className="text-gray-900 text-sm">{clientName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-700 text-sm">{b.boat?.name ?? '—'}</td>
                      <td className="px-5 py-3.5 text-gray-700 text-sm">
                        {b.start_date ? new Date(b.start_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-gray-900 font-semibold">{Number(b.total_price).toLocaleString('es-ES')}€</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {(() => { const s = payStatus(b); return <span className={`text-xs font-medium ${s.color}`}>{s.label}</span> })()}
                      </td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => setSelectedBooking(b)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] text-xs font-medium rounded-lg hover:bg-[#C9A84C]/20 transition-colors whitespace-nowrap">
                          <FileText size={12} /> Generar factura
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB PAGOS */}
      {tab === 'pagos' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="text-gray-900 font-semibold text-sm">Historial de pagos</h3>
          </div>
          {payments.length === 0 ? (
            <div className="text-center py-16 text-gray-700">No hay pagos registrados</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-5 py-3 text-gray-700 font-medium text-xs">Reserva</th>
                  <th className="text-left px-5 py-3 text-gray-700 font-medium text-xs">Cliente</th>
                  <th className="text-right px-5 py-3 text-gray-700 font-medium text-xs">Importe</th>
                  <th className="text-left px-5 py-3 text-gray-700 font-medium text-xs">Método</th>
                  <th className="text-left px-5 py-3 text-gray-700 font-medium text-xs">Fecha</th>
                  <th className="text-left px-5 py-3 text-gray-700 font-medium text-xs">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map(p => {
                  const cname = p.booking?.client ? `${p.booking.client.first_name} ${p.booking.client.last_name}` : '—'
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5"><span className="text-[#C9A84C] font-mono text-xs">{p.booking?.booking_number ?? '—'}</span></td>
                      <td className="px-5 py-3.5 text-gray-900">{cname}</td>
                      <td className="px-5 py-3.5 text-right"><span className="text-gray-900 font-semibold">{Number(p.amount).toLocaleString('es-ES')}€</span></td>
                      <td className="px-5 py-3.5 text-gray-700">{methodLabels[p.method] ?? p.method ?? '—'}</td>
                      <td className="px-5 py-3.5 text-gray-700">{new Date(p.payment_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_deposit ? 'text-blue-400 bg-blue-400/10' : 'text-green-400 bg-green-400/10'}`}>
                          {p.is_deposit ? 'Depósito' : 'Total'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal */}
      {selectedBooking && <InvoiceModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />}
    </div>
  )
}
