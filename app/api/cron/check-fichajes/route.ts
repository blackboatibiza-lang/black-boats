import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { sendPush } from '@/lib/push'

export async function GET(req: NextRequest) {
  // Verify cron secret to avoid unauthorized calls
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  // Get all active employees with their schedule for today
  const dayOfWeek = (now.getDay() + 6) % 7 // 0=Mon .. 6=Sun

  // Get Monday of current week
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - dayOfWeek)
  const weekStartStr = weekStart.toISOString().slice(0, 10)

  const { data: schedules } = await supabase
    .from('schedules')
    .select('*, user:staff_users(id,name,role,active)')
    .eq('week_start', weekStartStr)
    .eq('day_of_week', dayOfWeek)
    .eq('is_day_off', false)

  if (!schedules?.length) return NextResponse.json({ ok: true, checked: 0 })

  // Get today's entries
  const userIds = schedules.map((s: any) => s.user_id)
  const { data: entries } = await supabase
    .from('time_entries').select('*').eq('date', todayStr).in('user_id', userIds)

  const entriesMap: Record<string, any> = {}
  for (const e of entries ?? []) entriesMap[e.user_id] = e

  // Get push subscriptions
  const { data: subs } = await supabase
    .from('push_subscriptions').select('*').in('user_id', userIds)
  const subsMap: Record<string, any> = {}
  for (const s of subs ?? []) subsMap[s.user_id] = s

  // Get admin subscriptions for missed-clock alerts
  const { data: admins } = await supabase
    .from('staff_users').select('id').eq('role', 'admin').eq('active', true)
  const adminIds = (admins ?? []).map((a: any) => a.id)
  const { data: adminSubs } = await supabase
    .from('push_subscriptions').select('*').in('user_id', adminIds)

  const expiredSubs: string[] = []
  let notified = 0

  for (const schedule of schedules) {
    if (!schedule.user?.active) continue
    const userId = schedule.user_id
    const entry = entriesMap[userId]
    const sub = subsMap[userId]

    const [sh, sm] = (schedule.start_time ?? '09:00').split(':').map(Number)
    const [eh, em] = (schedule.end_time   ?? '18:00').split(':').map(Number)
    const startMins = sh * 60 + sm
    const endMins   = eh * 60 + em

    // Remind employee 15min before scheduled start if not clocked in
    const minsUntilStart = startMins - currentMinutes
    if (minsUntilStart >= 10 && minsUntilStart <= 20 && !entry?.clock_in && sub) {
      try {
        await sendPush(sub.subscription, {
          title: '⏰ Recuerda fichar entrada',
          body: `Tu turno empieza a las ${schedule.start_time?.slice(0,5)}. ¡No olvides fichar!`,
          tag: 'entrada-reminder',
          url: '/fichajes',
        })
        notified++
      } catch (e: any) {
        if (e.message === 'SUBSCRIPTION_EXPIRED') expiredSubs.push(userId)
      }
    }

    // Remind employee 10min before scheduled end if clocked in but not out
    const minsUntilEnd = endMins - currentMinutes
    if (minsUntilEnd >= 5 && minsUntilEnd <= 15 && entry?.clock_in && !entry?.clock_out && sub) {
      try {
        await sendPush(sub.subscription, {
          title: '⏰ Recuerda fichar salida',
          body: `Tu turno termina a las ${schedule.end_time?.slice(0,5)}. ¡No olvides fichar salida!`,
          tag: 'salida-reminder',
          url: '/fichajes',
        })
        notified++
      } catch (e: any) {
        if (e.message === 'SUBSCRIPTION_EXPIRED') expiredSubs.push(userId)
      }
    }

    // Alert admins if employee missed clock-in (30min after scheduled start, still no entry)
    const minsPastStart = currentMinutes - startMins
    if (minsPastStart >= 30 && minsPastStart <= 45 && !entry?.clock_in) {
      for (const adminSub of adminSubs ?? []) {
        try {
          await sendPush(adminSub.subscription, {
            title: '⚠️ Fichaje pendiente',
            body: `${schedule.user.name} no ha fichado entrada (turno a las ${schedule.start_time?.slice(0,5)})`,
            tag: `missed-${userId}`,
            url: '/fichajes',
          })
        } catch {}
      }
      notified++
    }

    // Alert admins if employee missed clock-out (45min after scheduled end, no clock-out)
    const minsPastEnd = currentMinutes - endMins
    if (minsPastEnd >= 45 && minsPastEnd <= 60 && entry?.clock_in && !entry?.clock_out) {
      for (const adminSub of adminSubs ?? []) {
        try {
          await sendPush(adminSub.subscription, {
            title: '⚠️ Salida sin fichar',
            body: `${schedule.user.name} no ha fichado salida (turno hasta las ${schedule.end_time?.slice(0,5)})`,
            tag: `nosalida-${userId}`,
            url: '/fichajes',
          })
        } catch {}
      }
      notified++
    }
  }

  // Clean expired subscriptions
  if (expiredSubs.length > 0) {
    await supabase.from('push_subscriptions').delete().in('user_id', expiredSubs)
  }

  return NextResponse.json({ ok: true, notified })
}
