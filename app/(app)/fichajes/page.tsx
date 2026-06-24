'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import {
  Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight,
  Bell, BellOff, Users, CalendarDays, BarChart2, Save, LogIn, LogOut, Pencil, X, Plus,
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
function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
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
      { key: 'equipo',   label: 'Fichajes', icon: Users },
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
      {tab === 'semana'   && <WeekTab  session={session} userId={session?.id ?? ''} readOnly={false} />}
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
  const [entry, setEntry]     = useState<any>(null)
  const [sched, setSched]     = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [clocking, setClocking] = useState(false)
  const [error, setError]     = useState('')

  // Photo capture state
  const [pendingAction, setPendingAction] = useState<'in' | 'out' | null>(null)
  const [photoPreview, setPhotoPreview]   = useState<string | null>(null)
  const [photoFile, setPhotoFile]         = useState<File | null>(null)
  const [uploading, setUploading]         = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const dayOfWeek = (now.getDay() + 6) % 7
    const weekStart = toDateStr(getWeekStart(now))
    const [{ data: e }, schedsRes] = await Promise.all([
      supabase.from('time_entries').select('*').eq('user_id', session?.id).eq('date', todayStr).maybeSingle(),
      fetch(`/api/fichajes/schedule?user_id=${session?.id}&week_start=${weekStart}`).then(r => r.json()),
    ])
    const s = (schedsRes.schedules ?? []).find((x: any) => x.day_of_week === dayOfWeek) ?? null
    setEntry(e)
    setSched(s)
    setLoading(false)
  }, [todayStr, session?.id])

  useEffect(() => { load() }, [load])

  function startClock(action: 'in' | 'out') {
    setPendingAction(action)
    setPhotoPreview(null)
    setPhotoFile(null)
    setTimeout(() => photoInputRef.current?.click(), 100)
  }

  function onPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) { setPendingAction(null); return }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  async function confirmClock() {
    if (!pendingAction || !photoFile) return
    setUploading(true); setError('')
    // Upload photo
    const ext = photoFile.name.split('.').pop() || 'jpg'
    const path = `fichajes/${session?.id}_${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('boat-images').upload(path, photoFile, { upsert: true, contentType: photoFile.type })
    let photo_url: string | null = null
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from('boat-images').getPublicUrl(path)
      photo_url = publicUrl
    }
    setUploading(false)
    setClocking(true)
    const res = await fetch('/api/fichajes/clock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: pendingAction, user_id: session?.id, date: todayStr, photo_url }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error)
    else setEntry(data.entry)
    setClocking(false)
    setPendingAction(null)
    setPhotoPreview(null)
    setPhotoFile(null)
  }

  function cancelClock() {
    setPendingAction(null)
    setPhotoPreview(null)
    setPhotoFile(null)
  }

  const clockedIn = isClockedIn(entry)
  const status = !entry?.clock_in ? 'out' : clockedIn ? 'in' : 'paused'
  const workedToday = workedMins(entry, clockedIn ? now : undefined)
  const scheduledToday = schedMins(sched?.start_time, sched?.end_time, sched?.start_time_2, sched?.end_time_2)
  const isOff = sched?.is_day_off

  return (
    <div className="space-y-4">
      {/* Hidden file input for camera */}
      <input ref={photoInputRef} type="file" accept="image/*" capture="user" className="hidden"
        onChange={onPhotoSelected} />

      {/* Photo confirmation modal */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <p className="text-gray-900 font-semibold text-center">
              {pendingAction === 'in' ? 'Fichar entrada' : 'Fichar salida'}
            </p>
            {photoPreview ? (
              <>
                <img src={photoPreview} alt="foto" className="w-full aspect-square object-cover rounded-xl" />
                <div className="flex gap-2">
                  <button onClick={() => { setPhotoPreview(null); setPhotoFile(null); setTimeout(() => photoInputRef.current?.click(), 100) }}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm rounded-xl hover:bg-gray-50">
                    Repetir foto
                  </button>
                  <button onClick={confirmClock} disabled={uploading || clocking}
                    className="flex-1 py-2.5 bg-[#C9A84C] text-black font-semibold text-sm rounded-xl hover:bg-[#E8C97A] disabled:opacity-60">
                    {uploading || clocking ? 'Fichando...' : 'Confirmar'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                  <LogIn size={28} className="text-gray-400" />
                </div>
                <p className="text-gray-700 text-sm">Hazte una foto para registrar tu fichaje</p>
                <button onClick={() => photoInputRef.current?.click()}
                  className="w-full py-3 bg-[#C9A84C] text-black font-semibold rounded-xl">
                  📷 Tomar foto
                </button>
              </div>
            )}
            <button onClick={cancelClock} className="w-full py-2 text-gray-500 text-sm hover:text-gray-700">Cancelar</button>
          </div>
        </div>
      )}

      {/* Main clock panel */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
        <p className="text-5xl font-bold text-gray-900 tracking-tight font-mono">
          {now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
        <p className="text-gray-700 text-sm mt-2 capitalize">
          {now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        {/* Schedule for today */}
        {!loading && sched && !isOff && (
          <div className="mt-4 inline-flex flex-col items-center gap-1">
            <p className="text-gray-500 text-xs uppercase tracking-wide">Horario hoy</p>
            <p className="text-gray-900 text-sm font-semibold">
              {sched.start_time?.slice(0,5)} – {sched.end_time?.slice(0,5)}
              {sched.start_time_2 && sched.end_time_2 && (
                <span className="text-gray-500 ml-2">· {sched.start_time_2?.slice(0,5)} – {sched.end_time_2?.slice(0,5)}</span>
              )}
            </p>
            <p className="text-gray-400 text-xs">{fmtMins(scheduledToday)} planificadas</p>
          </div>
        )}

        {!loading && (
          <div className="mt-6">
            {isOff ? (
              <div className="inline-flex items-center gap-2 px-5 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">
                <CheckCircle size={16} /> Día libre hoy
              </div>
            ) : status === 'in' ? (
              <div className="space-y-4">
                <p className="text-gray-700 text-sm">Trabajando desde las <strong className="text-gray-900">{fmtTime(entry?.periods?.at(-1)?.in ?? entry?.clock_in)}</strong></p>
                <button onClick={() => startClock('out')} disabled={clocking}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg rounded-2xl transition-all disabled:opacity-60 shadow-lg shadow-amber-200">
                  <LogOut size={22} /> Pausar / Fichar Salida
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {status === 'paused' && (
                  <p className="text-amber-600 text-sm font-medium">⏸ Pausado · {fmtMins(workedToday)} acumuladas</p>
                )}
                <button onClick={() => startClock('in')} disabled={clocking}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-[#C9A84C] hover:bg-[#E8C97A] text-black font-bold text-lg rounded-2xl transition-all disabled:opacity-60 shadow-lg shadow-yellow-200">
                  <LogIn size={22} /> {status === 'paused' ? 'Reanudar' : 'Fichar Entrada'}
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
    const supabase = createClient()
    const [{ data: ents }, schedsRes] = await Promise.all([
      supabase.from('time_entries').select('*').eq('user_id', userId).in('date', days),
      fetch(`/api/fichajes/schedule?user_id=${userId}&week_start=${ws}`).then(r => r.json()),
    ])
    const em: Record<string, any> = {}
    for (const e of ents ?? []) em[e.date] = e
    const sm: Record<number, any> = {}
    for (const s of schedsRes.schedules ?? []) sm[s.day_of_week] = s
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

      {/* Days — card layout (mobile-first) */}
      <div className="space-y-2">
        {rows.map(({ date, dateStr, sched, entry, sm, wm }, i) => {
          const isToday = toDateStr(new Date()) === dateStr
          const isOff = sched?.is_day_off
          const bal = wm - sm
          const hasSched = sm > 0
          const periods: { in: string; out: string | null }[] = entry?.periods ?? []
          const hasEntry = !!entry?.clock_in
          return (
            <div key={i} className={`bg-white border rounded-xl px-4 py-3 ${isToday ? 'border-[#C9A84C]/40 bg-[#C9A84C]/5' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-2">
                {/* Left: day + schedule */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm ${isToday ? 'text-[#C9A84C]' : 'text-gray-900'}`}>{DAYS[i]}</span>
                    <span className="text-gray-500 text-xs">{date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                    {isOff && <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">Libre</span>}
                  </div>
                  {!isOff && hasSched && (
                    <div className="mt-0.5 text-xs text-gray-500 space-y-0.5">
                      <span>{sched.start_time?.slice(0,5)} – {sched.end_time?.slice(0,5)}</span>
                      {sched.start_time_2 && sched.end_time_2 && (
                        <span className="ml-2 text-gray-400">· {sched.start_time_2?.slice(0,5)} – {sched.end_time_2?.slice(0,5)}</span>
                      )}
                    </div>
                  )}
                </div>
                {/* Right: balance */}
                <div className="text-right flex-shrink-0">
                  {wm > 0 && <p className="text-gray-900 text-sm font-bold">{fmtMins(wm)}</p>}
                  {hasSched && !isOff && (
                    <p className={`text-xs font-semibold ${bal >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtBalance(bal)}</p>
                  )}
                  {!hasEntry && !isOff && <p className="text-gray-400 text-xs">Sin fichar</p>}
                </div>
              </div>
              {/* Periods detail */}
              {hasEntry && (
                <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                  {periods.length > 0 ? periods.map((p, pi) => (
                    <div key={pi} className="flex items-center gap-1.5 text-xs text-gray-700">
                      <LogIn size={10} className="text-green-500 flex-shrink-0" />
                      <span className="font-mono">{fmtTime(p.in)}</span>
                      {p.out ? (
                        <>
                          <span className="text-gray-300">→</span>
                          <LogOut size={10} className="text-amber-500 flex-shrink-0" />
                          <span className="font-mono">{fmtTime(p.out)}</span>
                        </>
                      ) : (
                        <span className="text-green-600 font-medium">trabajando</span>
                      )}
                    </div>
                  )) : (
                    <div className="flex items-center gap-3 text-xs text-gray-700">
                      <span className="flex items-center gap-1"><LogIn size={10} className="text-green-500" /> <span className="font-mono">{fmtTime(entry?.clock_in)}</span></span>
                      {entry?.clock_out && <span className="flex items-center gap-1"><LogOut size={10} className="text-amber-500" /> <span className="font-mono">{fmtTime(entry?.clock_out)}</span></span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
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

// ── EQUIPO SEMANAL (admin) ─────────────────────────────────────────
type Period = { in: string; out: string }

function EquipoTab() {
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [employees, setEmployees] = useState<any[]>([])
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  // editing: { emp, date, entry }
  const [editing, setEditing] = useState<{ emp: any; date: string; entry: any } | null>(null)
  const [periods, setPeriods] = useState<Period[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const ws = toDateStr(weekStart)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/fichajes/semana?week_start=${ws}`)
    const data = await res.json()
    setEmployees(data.emps ?? [])
    setEntries(data.entries ?? [])
    setLoading(false)
  }, [ws])

  useEffect(() => { load() }, [load])

  function toLocal(ts: string) {
    if (!ts) return ''
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  }

  function getEntry(empId: string, date: string) {
    return entries.find(e => e.user_id === empId && e.date === date) ?? null
  }

  function openEdit(emp: any, date: string) {
    const entry = getEntry(emp.id, date)
    let initialPeriods: Period[] = []
    if (entry?.periods?.length > 0) {
      initialPeriods = entry.periods.map((p: any) => ({ in: toLocal(p.in), out: toLocal(p.out ?? '') }))
    } else if (entry?.clock_in) {
      initialPeriods = [{ in: toLocal(entry.clock_in), out: toLocal(entry.clock_out ?? '') }]
    }
    setPeriods(initialPeriods)
    setEditing({ emp, date, entry })
  }

  function setPeriod(i: number, field: 'in' | 'out', val: string) {
    setPeriods(ps => ps.map((p, idx) => idx === i ? { ...p, [field]: val } : p))
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    const { emp, date } = editing
    const toISO = (time: string) => time ? new Date(`${date}T${time}:00`).toISOString() : null
    const builtPeriods = periods
      .filter(p => p.in)
      .map(p => ({ in: toISO(p.in)!, out: toISO(p.out) }))
    const res = await fetch('/api/fichajes/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: emp.id, date, periods: builtPeriods, preConverted: true }),
    })
    const data = await res.json()
    if (!res.ok) alert('Error al guardar: ' + data.error)
    setSaving(false)
    setEditing(null)
    load()
  }

  async function deleteEntry() {
    if (!editing?.entry) return
    if (!confirm('¿Eliminar este fichaje?')) return
    setDeleting(true)
    const res = await fetch('/api/fichajes/semana', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editing.entry.id }),
    })
    if (!res.ok) alert('Error al eliminar')
    setDeleting(false)
    setEditing(null)
    load()
  }

  const todayStr = toDateStr(new Date())

  return (
    <div className="space-y-3">
      {/* Week navigator */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
        <button onClick={() => setWeekStart(w => addDays(w, -7))} className="p-1 text-gray-500 hover:text-gray-900 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium text-gray-900">
          {weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} – {addDays(weekStart, 6).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <button onClick={() => setWeekStart(w => addDays(w, 7))} className="p-1 text-gray-500 hover:text-gray-900 transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Header row */}
          <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: '120px repeat(7, 1fr)' }}>
            <div className="px-3 py-2 text-xs font-medium text-gray-500 border-r border-gray-100" />
            {days.map((d, i) => {
              const ds = toDateStr(d)
              const isToday = ds === todayStr
              return (
                <div key={i} className={`px-1 py-2 text-center border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-[#C9A84C]/8' : ''}`}>
                  <p className={`text-xs font-semibold ${isToday ? 'text-[#C9A84C]' : 'text-gray-500'}`}>{DAY_SHORT[i]}</p>
                  <p className={`text-xs ${isToday ? 'text-[#C9A84C] font-bold' : 'text-gray-400'}`}>{d.getDate()}</p>
                </div>
              )
            })}
          </div>

          {/* Employee rows */}
          {employees.map(emp => (
            <div key={emp.id} className="grid border-b border-gray-100 last:border-b-0" style={{ gridTemplateColumns: '120px repeat(7, 1fr)' }}>
              {/* Name */}
              <div className="px-3 py-2 border-r border-gray-100 flex items-center">
                <div>
                  <p className="text-xs font-medium text-gray-900 leading-tight truncate max-w-[100px]">{emp.name.split(' ')[0]}</p>
                  <p className="text-[10px] text-gray-400 truncate max-w-[100px]">{emp.name.split(' ').slice(1).join(' ')}</p>
                </div>
              </div>
              {/* Day cells */}
              {days.map((d, i) => {
                const ds = toDateStr(d)
                const entry = getEntry(emp.id, ds)
                const isToday = ds === todayStr
                const wm = workedMins(entry)
                const done = entry && (entry.clock_out || (entry.periods?.length > 0 && entry.periods[entry.periods.length - 1]?.out))
                const working = entry && isClockedIn(entry)

                return (
                  <button
                    key={i}
                    onClick={() => openEdit(emp, ds)}
                    className={`px-1 py-2 border-r border-gray-100 last:border-r-0 text-center transition-colors hover:bg-[#C9A84C]/5 min-h-[52px] flex flex-col items-center justify-center gap-0.5
                      ${isToday ? 'bg-[#C9A84C]/5' : ''}`}
                  >
                    {entry ? (
                      <>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                          done ? 'bg-green-100 text-green-700' :
                          working ? 'bg-blue-100 text-blue-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {done ? '✓' : working ? '●' : '?'}
                        </span>
                        {wm > 0 && <span className="text-[9px] text-gray-500 leading-none">{fmtMins(wm)}</span>}
                        <span className="text-[9px] text-gray-400 leading-none font-mono">
                          {fmtTime(entry.clock_in)}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-300 text-lg leading-none">+</span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* Edit / Add modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900 font-semibold">{editing.entry ? 'Editar fichaje' : 'Añadir fichaje'}</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {editing.emp.name} · {new Date(editing.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-700 p-1"><X size={18} /></button>
            </div>

            <div className="space-y-3">
              {periods.length === 0 && (
                <p className="text-gray-400 text-xs text-center py-2">Sin turnos. Añade uno abajo.</p>
              )}
              {periods.map((p, i) => (
                <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-700 text-xs font-medium">Turno {i + 1}</p>
                    <button onClick={() => setPeriods(ps => ps.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 p-0.5 transition-colors">
                      <X size={13} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-gray-500 text-xs block mb-1">Entrada</label>
                      <input type="time" value={p.in} onChange={e => setPeriod(i, 'in', e.target.value)}
                        className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/60" />
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs block mb-1">Salida</label>
                      <input type="time" value={p.out} onChange={e => setPeriod(i, 'out', e.target.value)}
                        className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/60" />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={() => setPeriods(ps => [...ps, { in: '', out: '' }])}
                className="w-full py-2 border-2 border-dashed border-gray-200 hover:border-[#C9A84C]/40 text-gray-500 hover:text-gray-700 text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5">
                <Plus size={13} /> Añadir turno
              </button>
            </div>

            <div className="flex gap-2 pt-1">
              {editing.entry && (
                <button onClick={deleteEntry} disabled={deleting}
                  className="px-3 py-2 border border-red-200 text-red-500 text-sm rounded-lg hover:bg-red-50 disabled:opacity-60 transition-colors">
                  {deleting ? '...' : 'Eliminar'}
                </button>
              )}
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
const emptyDay = (): DaySched => ({ start: '', end: '', start2: '', end2: '', off: false })

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
    const newSched: Record<number, DaySched> = Object.fromEntries(Array.from({ length: 7 }, (_, i) => [i, emptyDay()]))

    const { data } = await supabase.from('schedules').select('*').eq('user_id', selectedEmp).eq('week_start', ws)

    const hasData = (data ?? []).some((r: any) => r.start_time || r.is_day_off)

    if (hasData) {
      // Week has saved schedule — load it
      for (const row of data ?? []) {
        newSched[row.day_of_week] = {
          start: row.start_time?.slice(0,5) ?? '',
          end: row.end_time?.slice(0,5) ?? '',
          start2: row.start_time_2?.slice(0,5) ?? '',
          end2: row.end_time_2?.slice(0,5) ?? '',
          off: row.is_day_off,
        }
      }
    } else {
      // No schedule for this week — load the most recent previous week's schedule
      const { data: prev } = await supabase
        .from('schedules').select('*')
        .eq('user_id', selectedEmp)
        .lt('week_start', ws)
        .order('week_start', { ascending: false })
        .limit(7)
      if (prev && prev.length > 0) {
        // Get the latest week_start from previous data
        const latestWs = prev[0].week_start
        for (const row of prev.filter((r: any) => r.week_start === latestWs)) {
          newSched[row.day_of_week] = {
            start: row.start_time?.slice(0,5) ?? '',
            end: row.end_time?.slice(0,5) ?? '',
            start2: row.start_time_2?.slice(0,5) ?? '',
            end2: row.end_time_2?.slice(0,5) ?? '',
            off: row.is_day_off,
          }
        }
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
      start_time: schedule[i].start ? schedule[i].start + ':00' : null,
      end_time: schedule[i].end ? schedule[i].end + ':00' : null,
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
