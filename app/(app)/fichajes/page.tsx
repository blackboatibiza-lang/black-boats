'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import {
  Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight,
  Bell, BellOff, Users, CalendarDays, BarChart2, Save, LogIn, LogOut, Pencil, X,
} from 'lucide-react'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const DAY_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function getWeekStart(d = new Date()): Date {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - ((day + 6) % 7))
  date.setHours(0, 0, 0, 0)
  return date
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function toDateStr(d: Date): string { return d.toISOString().slice(0, 10) }
function fmtTime(ts?: string | null): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}
function schedMins(start?: string | null, end?: string | null, start2?: string | null, end2?: string | null): number {
  let total = 0
  if (start && end) {
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    total += Math.max(0, (eh * 60 + em) - (sh * 60 + sm))
  }
  if (start2 && end2) {
    const [sh, sm] = start2.split(':').map(Number)
    const [eh, em] = end2.split(':').map(Number)
    total += Math.max(0, (eh * 60 + em) - (sh * 60 + sm))
  }
  return total
}
function workedMins(entry: any, now?: Date): number {
  if (!entry) return 0
  const periods: { in: string; out: string | null }[] = entry.periods ?? []
  if (periods.length === 0) {
    if (!entry.clock_in) return 0
    const end = entry.clock_out ? new Date(entry.clock_out) : (now ?? new Date())
    return Math.round((end.getTime() - new Date(entry.clock_in).getTime()) / 60000)
  }
  return periods.reduce((acc, p) => {
    const end = p.out ? new Date(p.out) : (now ?? new Date())
    return acc + Math.round((end.getTime() - new Date(p.in).getTime()) / 60000)
  }, 0)
}
function isClockedIn(entry: any): boolean {
  const periods: { in: string; out: string | null }[] = entry?.periods ?? []
  if (periods.length > 0) return !periods[periods.length - 1].out
  return !!entry?.clock_in && !entry?.clock_out
}
function fmtMins(m: number): string {
  const h = Math.floor(Math.abs(m) / 60)
  const min = Math.abs(m) % 60
  return `${h}h${min > 0 ? ` ${min}m` : ''}`
}
function fmtBalance(m: number): string {
  return `${m >= 0 ? '+' : '-'}${fmtMins(m)}`
}

const inputCls = 'w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/60'
const labelCls = 'text-gray-700 text-xs mb-1 block font-medium'

export default function FichajesPage() {
  const [session] = useState(() => getSession())
  const isAdmin = session?.role === 'admin'
  const [tab, setTab] = useState<'fichar' | 'semana' | 'equipo' | 'horarios' | 'informe'>('fichar')
  const [now, setNow] = useState(new Date())

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Push notification state
  const [notifStatus, setNotifStatus] = useState<'unknown' | 'granted' | 'denied' | 'unsupported'>('unknown')

  useEffect(() => {
    if (!('Notification' in window)) { setNotifStatus('unsupported'); return }
    setNotifStatus(Notification.permission as any)
  }, [])

  async function requestNotifications() {
    if (!('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.register('/sw.js')
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') { setNotifStatus('denied'); return }
    setNotifStatus('granted')
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    })
    await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: session?.id, subscription: sub.toJSON() }),
    })
  }

  const tabs = [
    { key: 'fichar',   label: 'Fichar',    icon: Clock },
    { key: 'semana',   label: 'Mi semana', icon: CalendarDays },
    ...(isAdmin ? [
      { key: 'equipo',   label: 'Equipo hoy', icon: Users },
      { key: 'horarios', label: 'Horarios',   icon: CalendarDays },
      { key: 'informe',  label: 'Informe',    icon: BarChart2 },
    ] : []),
  ] as const

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 font-bold text-xl">Fichajes</h1>
          <p className="text-gray-700 text-sm mt-0.5">
            {now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {notifStatus === 'unknown' || notifStatus === 'unsupported' ? null : notifStatus === 'granted' ? (
          <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
            <Bell size={13} /> Notificaciones activas
          </div>
        ) : (
          <button onClick={requestNotifications}
            className="flex items-center gap-1.5 text-xs text-gray-700 bg-white border border-gray-200 hover:border-[#C9A84C]/50 px-3 py-1.5 rounded-lg transition-colors">
            <Bell size={13} /> Activar notificaciones
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center
              ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-700 hover:text-gray-900'}`}>
            <t.icon size={14} />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'fichar'   && <ClockTab session={session} now={now} notifStatus={notifStatus} onRequestNotif={requestNotifications} />}
      {tab === 'semana'   && <WeekTab  session={session} userId={session?.id} readOnly={false} />}
      {tab === 'equipo'   && isAdmin && <EquipoTab />}
      {tab === 'horarios' && isAdmin && <HorariosTab />}
      {tab === 'informe'  && isAdmin && <InformeTab />}
    </div>
  )
}

// ── CLOCK TAB ─────────────────────────────────────────────────────
function ClockTab({ session, now, notifStatus, onRequestNotif }: any) {
  const supabase = createClient()
  const todayStr = toDateStr(now)
  const [entry, setEntry]   = useState<any>(null)
  const [sched, setSched]   = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [clocking, setClocking] = useState(false)
  const [error, setError]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const dayOfWeek = (now.getDay() + 6) % 7
    const weekStart = toDateStr(getWeekStart(now))
    const [{ data: e }, { data: s }] = await Promise.all([
      supabase.from('time_entries').select('*').eq('user_id', session?.id).eq('date', todayStr).maybeSingle(),
      supabase.from('schedules').select('*').eq('user_id', session?.id).eq('week_start', weekStart).eq('day_of_week', dayOfWeek).maybeSingle(),
    ])
    setEntry(e)
    setSched(s)
    setLoading(false)
  }, [todayStr, session?.id])

  useEffect(() => { load() }, [load])

  async function handleClock(action: 'in' | 'out') {
    setClocking(true); setError('')
    const res = await fetch('/api/fichajes/clock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, user_id: session?.id, date: todayStr }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error)
    else setEntry(data.entry)
    setClocking(false)
  }

  const clockedIn = isClockedIn(entry)
  const status = !entry?.clock_in ? 'out' : clockedIn ? 'in' : 'paused'
  const workedToday = workedMins(entry, clockedIn ? now : undefined)
  const scheduledToday = schedMins(sched?.start_time, sched?.end_time, sched?.start_time_2, sched?.end_time_2)
  const isOff = sched?.is_day_off

  return (
    <div className="space-y-4">
      {/* Main clock panel */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
        <p className="text-5xl font-bold text-gray-900 tracking-tight font-mono">
          {now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
        <p className="text-gray-700 text-sm mt-2 capitalize">
          {now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        {!loading && (
          <div className="mt-8">
            {isOff ? (
              <div className="inline-flex items-center gap-2 px-5 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">
                <CheckCircle size={16} /> Día libre hoy
              </div>
            ) : status === 'in' ? (
              <div className="space-y-4">
                <p className="text-gray-700 text-sm">Trabajando desde las <strong className="text-gray-900">{fmtTime(entry?.periods?.at(-1)?.in ?? entry?.clock_in)}</strong></p>
                <button onClick={() => handleClock('out')} disabled={clocking}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg rounded-2xl transition-all disabled:opacity-60 shadow-lg shadow-amber-200">
                  <LogOut size={22} /> {clocking ? 'Fichando...' : 'Pausar / Fichar Salida'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {status === 'paused' && (
                  <p className="text-amber-600 text-sm font-medium">⏸ Pausado · {fmtMins(workedToday)} acumuladas</p>
                )}
                {sched && status === 'out' && (
                  <p className="text-gray-700 text-sm">Turno: <strong className="text-gray-900">{sched.start_time?.slice(0,5)} – {sched.end_time?.slice(0,5)}</strong></p>
                )}
                <button onClick={() => handleClock('in')} disabled={clocking}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-[#C9A84C] hover:bg-[#E8C97A] text-black font-bold text-lg rounded-2xl transition-all disabled:opacity-60 shadow-lg shadow-yellow-200">
                  <LogIn size={22} /> {clocking ? 'Fichando...' : status === 'paused' ? 'Reanudar' : 'Fichar Entrada'}
                </button>
              </div>
            )}
          </div>
        )}
        {error && <p className="mt-3 text-red-500 text-sm">{error}</p>}
      </div>

      {/* Today summary */}
      {!isOff && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-gray-700 text-xs mb-1">Entrada</p>
            <p className="text-gray-900 font-bold text-lg">{fmtTime(entry?.clock_in)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-gray-700 text-xs mb-1">Salida</p>
            <p className="text-gray-900 font-bold text-lg">{fmtTime(entry?.clock_out)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-gray-700 text-xs mb-1">Trabajadas</p>
            <p className="text-gray-900 font-bold text-lg">{workedToday > 0 ? fmtMins(workedToday) : '—'}</p>
          </div>
        </div>
      )}

      {/* Notification prompt */}
      {notifStatus !== 'granted' && notifStatus !== 'unsupported' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Bell size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-gray-900 text-sm font-medium">Activa las notificaciones</p>
            <p className="text-gray-700 text-xs mt-0.5">Recibirás recordatorios para fichar entrada y salida.</p>
          </div>
          <button onClick={onRequestNotif}
            className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex-shrink-0">
            Activar
          </button>
        </div>
      )}
    </div>
  )
}

// ── WEEK TAB ──────────────────────────────────────────────────────
function WeekTab({ userId, readOnly = true }: { session?: any; userId: string; readOnly?: boolean }) {
  const supabase = createClient()
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [entries, setEntries]     = useState<Record<string, any>>({})
  const [schedules, setSchedules] = useState<Record<number, any>>({})
  const [loading, setLoading]     = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const ws = toDateStr(weekStart)
    const days = Array.from({ length: 7 }, (_, i) => toDateStr(addDays(weekStart, i)))
    const [{ data: ents }, { data: scheds }] = await Promise.all([
      supabase.from('time_entries').select('*').eq('user_id', userId).in('date', days),
      supabase.from('schedules').select('*').eq('user_id', userId).eq('week_start', ws),
    ])
    const em: Record<string, any> = {}
    for (const e of ents ?? []) em[e.date] = e
    const sm: Record<number, any> = {}
    for (const s of scheds ?? []) sm[s.day_of_week] = s
    setEntries(em)
    setSchedules(sm)
    setLoading(false)
  }, [weekStart, userId])

  useEffect(() => { load() }, [load])

  let totalSched = 0, totalWorked = 0
  const rows = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i)
    const dateStr = toDateStr(date)
    const sched = schedules[i]
    const entry = entries[dateStr]
    const sm = sched?.is_day_off ? 0 : schedMins(sched?.start_time, sched?.end_time, sched?.start_time_2, sched?.end_time_2)
    const wm = workedMins(entry)
    totalSched += sm; totalWorked += wm
    return { date, dateStr, sched, entry, sm, wm }
  })

  const balance = totalWorked - totalSched
  const prevWeek = () => setWeekStart(w => addDays(w, -7))
  const nextWeek = () => setWeekStart(w => addDays(w, 7))

  return (
    <div className="space-y-4">
      {/* Week nav */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3">
        <button onClick={prevWeek} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-700">
          <ChevronLeft size={18} />
        </button>
        <p className="text-gray-900 font-semibold text-sm">
          {weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} —{' '}
          {addDays(weekStart, 6).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <button onClick={nextWeek} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-700">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Days table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-gray-700 font-medium text-xs">Día</th>
              <th className="text-center px-4 py-3 text-gray-700 font-medium text-xs">Horario</th>
              <th className="text-center px-4 py-3 text-gray-700 font-medium text-xs">Entrada</th>
              <th className="text-center px-4 py-3 text-gray-700 font-medium text-xs">Salida</th>
              <th className="text-center px-4 py-3 text-gray-700 font-medium text-xs">Trabajadas</th>
              <th className="text-center px-4 py-3 text-gray-700 font-medium text-xs">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(({ date, dateStr, sched, entry, sm, wm }, i) => {
              const isToday = toDateStr(new Date()) === dateStr
              const isOff = sched?.is_day_off
              const bal = wm - sm
              const hasSched = sm > 0
              return (
                <tr key={i} className={`${isToday ? 'bg-[#C9A84C]/5' : ''}`}>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${isToday ? 'text-[#C9A84C]' : 'text-gray-900'}`}>
                      {DAYS[i]}
                    </span>
                    <span className="text-gray-700 text-xs ml-1.5">
                      {date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700 text-xs">
                    {isOff ? <span className="px-2 py-0.5 bg-gray-100 rounded-full text-gray-700">Libre</span>
                      : hasSched ? `${sched.start_time?.slice(0,5)} – ${sched.end_time?.slice(0,5)}`
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-900 text-xs font-mono">{fmtTime(entry?.clock_in)}</td>
                  <td className="px-4 py-3 text-center text-gray-900 text-xs font-mono">{fmtTime(entry?.clock_out)}</td>
                  <td className="px-4 py-3 text-center text-gray-900 text-xs font-semibold">
                    {wm > 0 ? fmtMins(wm) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-xs font-semibold">
                    {!hasSched || isOff ? '—' : (
                      <span className={bal >= 0 ? 'text-green-600' : 'text-red-500'}>{fmtBalance(bal)}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td colSpan={2} className="px-4 py-3 text-gray-700 text-xs font-semibold">Total semana</td>
              <td colSpan={2} />
              <td className="px-4 py-3 text-center text-gray-900 text-sm font-bold">{fmtMins(totalWorked)}</td>
              <td className="px-4 py-3 text-center text-sm font-bold">
                <span className={balance >= 0 ? 'text-green-600' : 'text-red-500'}>{fmtBalance(balance)}</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-gray-700 text-xs mb-1">Horas planificadas</p>
          <p className="text-gray-900 font-bold text-xl">{fmtMins(totalSched)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-gray-700 text-xs mb-1">Horas trabajadas</p>
          <p className="text-gray-900 font-bold text-xl">{fmtMins(totalWorked)}</p>
        </div>
        <div className={`border rounded-xl p-4 text-center ${balance >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-gray-700 text-xs mb-1">Balance</p>
          <p className={`font-bold text-xl ${balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtBalance(balance)}</p>
        </div>
      </div>
    </div>
  )
}

// ── EQUIPO (admin) ────────────────────────────────────────────────
function EquipoTab() {
  const supabase = createClient()
  const [date, setDate] = useState(toDateStr(new Date()))
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any>(null) // { emp, entry }
  const [editIn, setEditIn] = useState('')
  const [editOut, setEditOut] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const d = new Date(date + 'T12:00:00')
    const dayOfWeek = (d.getDay() + 6) % 7
    const ws = toDateStr(getWeekStart(d))
    const [{ data: emps }, { data: entries }, { data: scheds }] = await Promise.all([
      supabase.from('staff_users').select('id,name,role').order('name'),
      supabase.from('time_entries').select('*').eq('date', date),
      supabase.from('schedules').select('*').eq('week_start', ws).eq('day_of_week', dayOfWeek),
    ])
    const entMap: Record<string, any> = {}
    for (const e of entries ?? []) entMap[e.user_id] = e
    const schedMap: Record<string, any> = {}
    for (const s of scheds ?? []) schedMap[s.user_id] = s
    setEmployees((emps ?? []).map(emp => ({ ...emp, entry: entMap[emp.id], sched: schedMap[emp.id] })))
    setLoading(false)
  }, [date])

  useEffect(() => { load() }, [load])

  function openEdit(emp: any) {
    const entry = emp.entry
    const toLocal = (ts: string) => {
      if (!ts) return ''
      const d = new Date(ts)
      return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
    }
    setEditIn(toLocal(entry?.clock_in))
    setEditOut(toLocal(entry?.clock_out))
    setEditing(emp)
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    const toISO = (time: string) => time ? new Date(`${date}T${time}:00`).toISOString() : null
    const clock_in = toISO(editIn) || null
    const clock_out = toISO(editOut) || null
    await supabase.from('time_entries').upsert({
      user_id: editing.id, date,
      clock_in, clock_out,
      ...(editing.entry?.id ? { id: editing.entry.id } : {}),
    }, { onConflict: 'user_id,date' })
    setSaving(false)
    setEditing(null)
    load()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
        <CalendarDays size={16} className="text-gray-700" />
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="flex-1 text-sm text-gray-900 bg-transparent focus:outline-none" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-100">
            {employees.map(emp => {
              const entry = emp.entry
              const sched = emp.sched
              const isOff = sched?.is_day_off
              const hasEntry = !!entry?.clock_in
              const done = hasEntry && !!entry?.clock_out
              const wm = workedMins(entry)
              const hasSched = !isOff && sched?.start_time

              let statusEl
              if (isOff) statusEl = <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">Día libre</span>
              else if (done) statusEl = <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1"><CheckCircle size={11} /> Completado</span>
              else if (hasEntry) statusEl = <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1"><Clock size={11} /> Trabajando</span>
              else statusEl = <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-full flex items-center gap-1"><AlertCircle size={11} /> Sin fichar</span>

              return (
                <div key={emp.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#C9A84C]/10 flex items-center justify-center text-[#C9A84C] text-sm font-bold">
                      {emp.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-gray-900 text-sm font-medium">{emp.name}</p>
                      {hasSched && <p className="text-gray-700 text-xs">{sched.start_time?.slice(0,5)} – {sched.end_time?.slice(0,5)}</p>}
                      {hasEntry && (
                        <p className="text-gray-700 text-xs font-mono">
                          {fmtTime(entry?.clock_in)}{entry?.clock_out ? ` → ${fmtTime(entry?.clock_out)}` : ''}{wm > 0 ? ` · ${fmtMins(wm)}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusEl}
                    <button onClick={() => openEdit(emp)} className="p-1.5 text-gray-400 hover:text-[#C9A84C] hover:bg-gray-100 rounded-lg transition-colors" title="Editar fichaje">
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900 font-semibold">Editar fichaje</p>
                <p className="text-gray-700 text-xs mt-0.5">{editing.name} · {date}</p>
              </div>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-700 p-1"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-gray-700 text-xs block mb-1">Hora de entrada</label>
                <input type="time" value={editIn} onChange={e => setEditIn(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/60" />
              </div>
              <div>
                <label className="text-gray-700 text-xs block mb-1">Hora de salida</label>
                <input type="time" value={editOut} onChange={e => setEditOut(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/60" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditing(null)} className="flex-1 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={saveEdit} disabled={saving}
                className="flex-1 py-2 bg-[#C9A84C] text-black font-semibold text-sm rounded-lg hover:bg-[#E8C97A] disabled:opacity-60">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── HORARIOS (admin) ──────────────────────────────────────────────
type DaySched = { start: string; end: string; start2: string; end2: string; off: boolean }
const emptyDay = (): DaySched => ({ start: '09:00', end: '13:00', start2: '', end2: '', off: false })

function HorariosTab() {
  const supabase = createClient()
  const [employees, setEmployees] = useState<any[]>([])
  const [selectedEmp, setSelectedEmp] = useState('')
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [schedule, setSchedule] = useState<Record<number, DaySched>>(() =>
    Object.fromEntries(Array.from({ length: 7 }, (_, i) => [i, emptyDay()]))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('staff_users').select('id,name').order('name')
      .then(({ data }) => { setEmployees(data ?? []); if (data?.length) setSelectedEmp(data[0].id) })
  }, [])

  const loadSchedule = useCallback(async () => {
    if (!selectedEmp) return
    const ws = toDateStr(weekStart)
    const { data } = await supabase.from('schedules').select('*').eq('user_id', selectedEmp).eq('week_start', ws)
    const newSched: Record<number, DaySched> = Object.fromEntries(Array.from({ length: 7 }, (_, i) => [i, emptyDay()]))
    for (const row of data ?? []) {
      newSched[row.day_of_week] = {
        start: row.start_time?.slice(0,5) ?? '09:00',
        end: row.end_time?.slice(0,5) ?? '13:00',
        start2: row.start_time_2?.slice(0,5) ?? '',
        end2: row.end_time_2?.slice(0,5) ?? '',
        off: row.is_day_off,
      }
    }
    setSchedule(newSched)
  }, [selectedEmp, weekStart])

  useEffect(() => { loadSchedule() }, [loadSchedule])

  async function save() {
    if (!selectedEmp) return
    setSaving(true)
    const ws = toDateStr(weekStart)
    const rows = Array.from({ length: 7 }, (_, i) => ({
      user_id: selectedEmp,
      week_start: ws,
      day_of_week: i,
      start_time: schedule[i].start + ':00',
      end_time: schedule[i].end + ':00',
      start_time_2: schedule[i].start2 ? schedule[i].start2 + ':00' : null,
      end_time_2: schedule[i].end2 ? schedule[i].end2 + ':00' : null,
      is_day_off: schedule[i].off,
    }))
    const { error } = await supabase.from('schedules').upsert(rows, { onConflict: 'user_id,week_start,day_of_week' })
    if (error) console.error(error)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const totalWeekMins = Object.values(schedule).reduce((acc, d) =>
    acc + (d.off ? 0 : schedMins(d.start, d.end, d.start2, d.end2)), 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} className={inputCls + ' sm:w-56'}>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <div className="flex items-center gap-2 flex-1">
          <button onClick={() => setWeekStart(w => addDays(w, -7))} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"><ChevronLeft size={16} /></button>
          <div className="flex-1 text-center text-sm font-medium text-gray-900">
            {weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} – {addDays(weekStart, 6).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <button onClick={() => setWeekStart(w => addDays(w, 7))} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"><ChevronRight size={16} /></button>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border ${totalWeekMins === 2400 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
          <Clock size={14} />
          {fmtMins(totalWeekMins)} / 40h
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 7 }, (_, i) => {
            const day = schedule[i]
            const dayMins = day.off ? 0 : schedMins(day.start, day.end, day.start2, day.end2)
            const set = (field: keyof DaySched, val: any) => setSchedule(s => ({ ...s, [i]: { ...s[i], [field]: val } }))
            return (
              <div key={i} className={`px-4 py-3 ${day.off ? 'opacity-40' : ''}`}>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="w-20 flex-shrink-0">
                    <p className="text-gray-900 text-sm font-medium">{DAYS[i]}</p>
                    <p className="text-gray-500 text-xs">{addDays(weekStart, i).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 select-none cursor-pointer mr-1">
                    <input type="checkbox" checked={day.off} onChange={e => set('off', e.target.checked)} className="w-4 h-4 accent-[#C9A84C]" />
                    Libre
                  </label>
                  {!day.off && (
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                      {/* Turno 1 */}
                      <div className="flex items-center gap-1.5">
                        <input type="time" value={day.start} onChange={e => set('start', e.target.value)}
                          className="px-2 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/60 w-[6.5rem]" />
                        <span className="text-gray-400 text-xs">–</span>
                        <input type="time" value={day.end} onChange={e => set('end', e.target.value)}
                          className="px-2 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/60 w-[6.5rem]" />
                      </div>
                      {/* Turno 2 */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400 text-xs">+</span>
                        <input type="time" value={day.start2} onChange={e => set('start2', e.target.value)}
                          placeholder="--:--"
                          className="px-2 py-1.5 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/60 w-[6.5rem]" />
                        <span className="text-gray-400 text-xs">–</span>
                        <input type="time" value={day.end2} onChange={e => set('end2', e.target.value)}
                          className="px-2 py-1.5 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/60 w-[6.5rem]" />
                      </div>
                      <span className="text-[#C9A84C] text-xs font-semibold">{fmtMins(dayMins)}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button onClick={() => setWeekStart(w => addDays(w, 7))} className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm rounded-lg transition-colors">
          Copiar a semana siguiente →
        </button>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-[#C9A84C] hover:bg-[#E8C97A] text-black font-semibold text-sm rounded-lg transition-colors disabled:opacity-60">
          <Save size={15} />
          {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar horario'}
        </button>
      </div>
    </div>
  )
}

// ── INFORME (admin) ───────────────────────────────────────────────
function InformeTab() {
  const supabase = createClient()
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const ws = toDateStr(weekStart)
      const days = Array.from({ length: 7 }, (_, i) => toDateStr(addDays(weekStart, i)))

      const [{ data: emps }, { data: entries }, { data: scheds }] = await Promise.all([
        supabase.from('staff_users').select('id,name').order('name'),
        supabase.from('time_entries').select('*').in('date', days),
        supabase.from('schedules').select('*').eq('week_start', ws),
      ])

      setEmployees((emps ?? []).map(emp => {
        let totalSched = 0, totalWorked = 0
        for (let i = 0; i < 7; i++) {
          const date = toDateStr(addDays(weekStart, i))
          const sched = (scheds ?? []).find((s: any) => s.user_id === emp.id && s.day_of_week === i)
          const entry = (entries ?? []).find((e: any) => e.user_id === emp.id && e.date === date)
          if (sched && !sched.is_day_off) totalSched += schedMins(sched.start_time, sched.end_time, sched.start_time_2, sched.end_time_2)
          totalWorked += workedMins(entry)
        }
        return { ...emp, totalSched, totalWorked, balance: totalWorked - totalSched }
      }))
      setLoading(false)
    }
    load()
  }, [weekStart])

  if (loading) return <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3">
        <button onClick={() => setWeekStart(w => addDays(w, -7))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-700"><ChevronLeft size={18} /></button>
        <p className="text-gray-900 font-semibold text-sm">
          {weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} —{' '}
          {addDays(weekStart, 6).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <button onClick={() => setWeekStart(w => addDays(w, 7))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-700"><ChevronRight size={18} /></button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-gray-700 font-medium text-xs">Empleado</th>
              <th className="text-center px-5 py-3 text-gray-700 font-medium text-xs">Planificadas</th>
              <th className="text-center px-5 py-3 text-gray-700 font-medium text-xs">Trabajadas</th>
              <th className="text-center px-5 py-3 text-gray-700 font-medium text-xs">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {employees.map(emp => (
              <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#C9A84C]/10 flex items-center justify-center text-[#C9A84C] text-xs font-bold">
                      {emp.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-gray-900 font-medium">{emp.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-center text-gray-900 font-semibold">{fmtMins(emp.totalSched)}</td>
                <td className="px-5 py-3.5 text-center text-gray-900 font-semibold">{fmtMins(emp.totalWorked)}</td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`font-bold text-sm px-3 py-1 rounded-full ${emp.balance >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {fmtBalance(emp.balance)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
