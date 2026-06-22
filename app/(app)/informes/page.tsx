'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, CalendarDays, CreditCard, Banknote, X, Percent } from 'lucide-react'
import { getSession } from '@/lib/session'

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const METHOD_GROUPS: Record<string, { label: string; color: string; methods: string[] }> = {
  efectivo: { label: 'Efectivo',  color: 'text-green-400',  methods: ['cash','efectivo'] },
  banco:    { label: 'Banco/Transferencia', color: 'text-blue-400', methods: ['transfer','card','bizum','link','transferencia','tarjeta'] },
}

function methodGroup(method: string): string {
  const m = (method ?? '').toLowerCase()
  if (METHOD_GROUPS.efectivo.methods.some(x => m.includes(x))) return 'efectivo'
  return 'banco'
}

function extractMethod(notes: string): string {
  const match = (notes ?? '').match(/Método pago: (\w+)/)
  return match ? match[1] : 'transfer'
}

export default function InformesPage() {
  const [year, setYear]           = useState(new Date().getFullYear())
  const [month, setMonth]         = useState(new Date().getMonth()) // 0-indexed
  const [bookings, setBookings]   = useState<any[]>([])
  const [expenses, setExpenses]   = useState<any[]>([])
  const [boatSocios, setBoatSocios] = useState<any[]>([]) // { boat_id, boat_name, socios: [{ name, profit_pct, expense_pct }] }
  const [loading, setLoading]     = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

  useEffect(() => { load() }, [year])

  async function load() {
    const session  = getSession()
    const isSocio  = session?.role === 'socio'
    const boatIds  = session?.boatIds ?? []
    const hasLimit = isSocio && boatIds.length > 0

    const supabase = createClient()
    const from = `${year}-01-01`
    const to   = `${year}-12-31`

    let bkQ = supabase.from('bookings')
      .select('id,start_date,total_price,status,internal_notes,boat_id,boat:boats(name)')
      .gte('start_date', from).lte('start_date', to)
      .neq('status', 'cancelled')
    if (hasLimit) bkQ = bkQ.in('boat_id', boatIds)

    let expQ = supabase.from('expenses')
      .select('id,date,amount,concept,category,boat_id,assigned_to,boat:boats(name)')
      .gte('date', from).lte('date', to)
    if (hasLimit) expQ = expQ.in('boat_id', boatIds)

    // Admin sees all boats/socios; socio sees only their own boats with their own percentages
    const isAdmin  = session?.role === 'admin'
    const isSocio2 = session?.role === 'socio'
    let boatSociosData: any[] = []
    if (isAdmin || isSocio2) {
      let accessQ = supabase
        .from('staff_boat_access')
        .select('boat_id, profit_percentage, expense_percentage, user:staff_users(id, name, role)')
      if (isSocio2 && session?.id) accessQ = accessQ.eq('user_id', session.id)

      const { data: accessRows } = await accessQ
      const boatIdsForSplit = isSocio2 ? (session?.boatIds ?? []) : null
      let boatsQ = supabase.from('boats').select('id,name').order('name')
      if (boatIdsForSplit && boatIdsForSplit.length > 0) boatsQ = boatsQ.in('id', boatIdsForSplit)
      const { data: allBoats } = await boatsQ

      if (accessRows && allBoats) {
        const socios = isAdmin
          ? accessRows.filter((r: any) => r.user?.role === 'socio')
          : accessRows // for socio, already filtered to their own rows
        boatSociosData = allBoats.map((b: any) => ({
          boat_id: b.id,
          boat_name: b.name,
          socios: socios.filter((r: any) => r.boat_id === b.id).map((r: any) => ({
            name: r.user?.name ?? session?.name ?? '',
            profit_pct: r.profit_percentage ?? 50,
            expense_pct: r.expense_percentage ?? 50,
          })),
        })).filter((b: any) => b.socios.length > 0)
      }
    }

    const [{ data: bk }, { data: exp }] = await Promise.all([bkQ, expQ])
    setBookings(bk ?? [])
    setExpenses(exp ?? [])
    setBoatSocios(boatSociosData)
    setLoading(false)
  }

  // ── Datos del mes seleccionado ──────────────────────────────────
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthBookings = bookings.filter(b => b.start_date?.startsWith(monthStr))
  const monthExpenses = expenses.filter(e => e.date?.startsWith(monthStr))

  const totalMonth    = monthBookings.reduce((s, b) => s + Number(b.total_price ?? 0), 0)
  const totalExpMonth = monthExpenses.reduce((s, e) => s + Number(e.amount ?? 0), 0)
  const netMonth      = totalMonth - totalExpMonth

  // Desglose por método de pago del mes
  const byGroup = Object.entries(METHOD_GROUPS).map(([key, cfg]) => {
    const bks = monthBookings.filter(b => methodGroup(extractMethod(b.internal_notes ?? '')) === key)
    return { key, label: cfg.label, color: cfg.color, count: bks.length, total: bks.reduce((s, b) => s + Number(b.total_price ?? 0), 0), bookings: bks }
  })

  // ── Datos anuales para gráficos ─────────────────────────────────
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const ms = `${year}-${String(i + 1).padStart(2, '0')}`
    const mBk  = bookings.filter(b => b.start_date?.startsWith(ms))
    const mExp = expenses.filter(e => e.date?.startsWith(ms))
    const ingresos = mBk.reduce((s, b) => s + Number(b.total_price ?? 0), 0)
    const gastos   = mExp.reduce((s, e) => s + Number(e.amount ?? 0), 0)
    return { mes: MONTHS_ES[i], ingresos, gastos, neto: ingresos - gastos, reservas: mBk.length }
  })

  const totalYear    = bookings.reduce((s, b) => s + Number(b.total_price ?? 0), 0)
  const totalExpYear = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0)
  const netYear      = totalYear - totalExpYear

  const tooltipStyle = { backgroundColor: '#141414', border: '1px solid #2A2A2A', borderRadius: 8, color: '#fff', fontSize: 12 }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-gray-900 font-bold text-xl">Informes</h1>
          <p className="text-gray-700 text-sm mt-0.5">Análisis financiero y de rendimiento</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setYear(y => y - 1)} className="px-3 py-2 bg-white border border-gray-200 text-gray-700 hover:text-gray-900 rounded-lg text-sm transition-colors">←</button>
          <span className="text-gray-900 font-bold text-lg w-16 text-center">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="px-3 py-2 bg-white border border-gray-200 text-gray-700 hover:text-gray-900 rounded-lg text-sm transition-colors">→</button>
        </div>
      </div>

      {/* KPIs anuales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos año',   value: `${totalYear.toLocaleString('es-ES')}€`,    icon: TrendingUp,   color: 'text-green-400',  bg: 'bg-green-400/10' },
          { label: 'Gastos año',     value: `${totalExpYear.toLocaleString('es-ES')}€`,  icon: TrendingDown, color: 'text-red-400',    bg: 'bg-red-400/10' },
          { label: 'Beneficio neto', value: `${netYear.toLocaleString('es-ES')}€`,       icon: TrendingUp,   color: netYear >= 0 ? 'text-[#C9A84C]' : 'text-red-400', bg: 'bg-[#C9A84C]/10' },
          { label: 'Reservas año',   value: String(bookings.length),                     icon: CalendarDays, color: 'text-blue-400',   bg: 'bg-blue-400/10' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-700 text-xs">{k.label}</p>
                <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center`}>
                <k.icon size={17} className={k.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico ingresos vs gastos */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-gray-900 font-semibold text-sm mb-4">Ingresos vs Gastos ({year})</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barGap={4}>
            <XAxis dataKey="mes" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${Number(v).toLocaleString('es-ES')}€`} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }} />
            <Bar dataKey="ingresos" name="Ingresos" fill="#C9A84C" radius={[3,3,0,0]} />
            <Bar dataKey="gastos"   name="Gastos"   fill="#EF4444" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico reservas y neto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-gray-900 font-semibold text-sm mb-4">Reservas por mes</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <XAxis dataKey="mes" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${v} reservas`} />
              <Bar dataKey="reservas" name="Reservas" fill="#60A5FA" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-gray-900 font-semibold text-sm mb-4">Rentabilidad neta mensual</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
              <XAxis dataKey="mes" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${Number(v).toLocaleString('es-ES')}€`} />
              <Line type="monotone" dataKey="neto" name="Neto" stroke="#C9A84C" strokeWidth={2} dot={{ fill: '#C9A84C', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── División por barco y socio ── */}
      {boatSocios.length > 0 && (() => {
        const boatDivision = boatSocios.map(b => {
          const bkBoat  = bookings.filter((bk: any) => bk.boat_id === b.boat_id)
          const expBoat = expenses.filter((e: any) => e.boat_id === b.boat_id)
          const income  = bkBoat.reduce((s: number, bk: any) => s + Number(bk.total_price ?? 0), 0)
          const expTotal = expBoat.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0)

          // Gastos sin asignar → reducen el neto antes de dividir por %
          const expSharedTotal = expBoat
            .filter((e: any) => !e.assigned_to)
            .reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0)
          // Gastos asignados a BB → se descuentan directamente de la parte de BB
          const expBBFixed = expBoat
            .filter((e: any) => e.assigned_to === 'blackboats')
            .reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0)

          // Neto base para dividir = ingresos - gastos compartidos (los asignados NO entran aquí)
          const netBase = income - expSharedTotal

          return { ...b, income, expTotal, netBase, expSharedTotal, expBBFixed, expBoat }
        })
        return (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
              <Percent size={15} className="text-[#C9A84C]" />
              <h2 className="text-gray-900 font-semibold text-sm">División de ganancias por barco y socio ({year})</h2>
            </div>
            <div className="p-5 space-y-4">
              {boatDivision.map(b => (
                <div key={b.boat_id} className="bg-gray-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-gray-900 font-semibold text-sm">{b.boat_name}</p>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-gray-700">Ingresos: <span className="text-green-400 font-medium">{b.income.toLocaleString('es-ES')}€</span></span>
                      <span className="text-gray-700">Gastos: <span className="text-red-400 font-medium">{b.expTotal.toLocaleString('es-ES')}€</span></span>
                      <span className="text-gray-700">Neto: <span className={`font-bold ${(b.income - b.expTotal) >= 0 ? 'text-[#C9A84C]' : 'text-red-400'}`}>{(b.income - b.expTotal).toLocaleString('es-ES')}€</span></span>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    {b.socios.map((s: any) => {
                      // 1. Neto base (ingresos - gastos sin asignar) se divide por % de ganancias
                      const socioGross = b.netBase * (s.profit_pct / 100)
                      const bbGross    = b.netBase * ((100 - s.profit_pct) / 100)

                      // 2. Gastos asignados directamente a este socio → se descuentan de su parte
                      const expSocioFixed = b.expBoat
                        .filter((e: any) => e.assigned_to === s.id)
                        .reduce((acc: number, e: any) => acc + Number(e.amount ?? 0), 0)

                      // 3. Resultado final
                      const socioNet = socioGross - expSocioFixed
                      const bbNet    = bbGross - b.expBBFixed

                      return (
                        <div key={s.name} className="grid grid-cols-2 gap-2">
                          <div className="bg-gray-50 border border-sky-400/20 rounded-lg p-3">
                            <p className="text-gray-700 text-xs mb-1">Socio · {s.name} ({s.profit_pct}%)</p>
                            <p className={`text-lg font-bold ${socioNet >= 0 ? 'text-sky-400' : 'text-red-400'}`}>{socioNet.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€</p>
                            <p className="text-gray-700 text-xs mt-1">
                              {socioGross.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€ bruto
                              {expSocioFixed > 0 && <span className="text-red-400/70"> − {expSocioFixed.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€ gastos</span>}
                            </p>
                          </div>
                          <div className="bg-gray-50 border border-[#C9A84C]/20 rounded-lg p-3">
                            <p className="text-gray-700 text-xs mb-1">Black Boats ({100 - s.profit_pct}%)</p>
                            <p className={`text-lg font-bold ${bbNet >= 0 ? 'text-[#C9A84C]' : 'text-red-400'}`}>{bbNet.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€</p>
                            <p className="text-gray-700 text-xs mt-1">
                              {bbGross.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€ bruto
                              {b.expBBFixed > 0 && <span className="text-red-400/70"> − {b.expBBFixed.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€ gastos</span>}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* ── Informe mensual ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-gray-900 font-semibold text-sm">Informe mensual detallado</h2>
          <div className="flex gap-1 flex-wrap">
            {MONTHS_ES.map((m, i) => (
              <button key={i} onClick={() => setMonth(i)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all
                  ${month === i ? 'bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30' : 'text-gray-700 hover:text-gray-900 border border-transparent'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Resumen del mes */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-100 rounded-xl p-4">
              <p className="text-gray-700 text-xs mb-1">Facturado</p>
              <p className="text-gray-900 text-xl font-bold">{totalMonth.toLocaleString('es-ES')}€</p>
              <p className="text-gray-700 text-xs mt-0.5">{monthBookings.length} reservas</p>
            </div>
            <div className="bg-gray-100 rounded-xl p-4">
              <p className="text-gray-700 text-xs mb-1">Gastos</p>
              <p className="text-red-400 text-xl font-bold">-{totalExpMonth.toLocaleString('es-ES')}€</p>
              <p className="text-gray-700 text-xs mt-0.5">{monthExpenses.length} registros</p>
            </div>
            <div className="bg-gray-100 rounded-xl p-4">
              <p className="text-gray-700 text-xs mb-1">Beneficio neto</p>
              <p className={`text-xl font-bold ${netMonth >= 0 ? 'text-[#C9A84C]' : 'text-red-400'}`}>{netMonth.toLocaleString('es-ES')}€</p>
              <p className="text-gray-700 text-xs mt-0.5">{totalMonth > 0 ? Math.round((netMonth / totalMonth) * 100) : 0}% margen</p>
            </div>
          </div>

          {/* Desglose por método de pago */}
          <div>
            <p className="text-gray-700 text-xs mb-3 font-medium uppercase tracking-wider">Por método de cobro</p>
            <div className="grid grid-cols-2 gap-3">
              {byGroup.map(g => (
                <button key={g.key} onClick={() => setSelectedGroup(selectedGroup === g.key ? null : g.key)}
                  className={`p-4 rounded-xl border text-left transition-all ${selectedGroup === g.key ? 'border-[#C9A84C]/50 bg-[#C9A84C]/5' : 'border-gray-200 bg-gray-100 hover:border-[#3A3A3A]'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {g.key === 'efectivo' ? <Banknote size={15} className="text-green-400" /> : <CreditCard size={15} className="text-blue-400" />}
                    <p className="text-gray-900 text-sm font-medium">{g.label}</p>
                  </div>
                  <p className={`text-xl font-bold ${g.color}`}>{g.total.toLocaleString('es-ES')}€</p>
                  <p className="text-gray-700 text-xs mt-0.5">{g.count} reserva{g.count !== 1 ? 's' : ''}</p>
                  {totalMonth > 0 && (
                    <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-[#C9A84C] rounded-full" style={{ width: `${Math.round((g.total / totalMonth) * 100)}%` }} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Reservas del grupo seleccionado */}
          {selectedGroup && (() => {
            const g = byGroup.find(x => x.key === selectedGroup)!
            return (
              <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                  <p className="text-gray-900 text-sm font-medium">Reservas — {g.label} · {MONTHS_ES[month]} {year}</p>
                  <button onClick={() => setSelectedGroup(null)} className="text-gray-700 hover:text-gray-900 transition-colors"><X size={14} /></button>
                </div>
                {g.bookings.length === 0 ? (
                  <p className="text-center py-8 text-gray-700 text-sm">No hay reservas con este método</p>
                ) : (
                  <div className="overflow-x-auto"><table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left px-4 py-2 text-gray-700 text-xs">Fecha</th>
                        <th className="text-left px-4 py-2 text-gray-700 text-xs">Barco</th>
                        <th className="text-right px-4 py-2 text-gray-700 text-xs">Importe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {g.bookings.map(b => (
                        <tr key={b.id} className="hover:bg-[#222] transition-colors">
                          <td className="px-4 py-2.5 text-gray-700 text-xs">
                            {new Date(b.start_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                          </td>
                          <td className="px-4 py-2.5 text-gray-900 text-xs">{b.boat?.name ?? '—'}</td>
                          <td className="px-4 py-2.5 text-right text-[#C9A84C] font-semibold">{Number(b.total_price ?? 0).toLocaleString('es-ES')}€</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200 bg-white">
                        <td colSpan={2} className="px-4 py-2.5 text-gray-700 text-xs">Total</td>
                        <td className="px-4 py-2.5 text-right text-gray-900 font-bold">{g.total.toLocaleString('es-ES')}€</td>
                      </tr>
                    </tfoot>
                  </table></div>
                )}
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
