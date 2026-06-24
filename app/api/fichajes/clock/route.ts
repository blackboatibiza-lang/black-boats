import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { action, user_id, date, photo_url } = await req.json()
  if (!action || !user_id || !date) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const supabase = createClient()
  const now = new Date().toISOString()

  const { data: existing } = await supabase
    .from('time_entries').select('*').eq('user_id', user_id).eq('date', date).maybeSingle()

  const periods: { in: string; out: string | null }[] = existing?.periods ?? []
  const lastPeriod = periods[periods.length - 1]
  const isClockedIn = lastPeriod && !lastPeriod.out

  if (action === 'in') {
    if (isClockedIn) return NextResponse.json({ error: 'Ya estás fichado' }, { status: 409 })
    const newPeriods = [...periods, { in: now, out: null, photo_in: photo_url ?? null }]
    let result
    if (existing) {
      result = await supabase.from('time_entries')
        .update({ periods: newPeriods, clock_in: existing.clock_in ?? now, clock_out: null })
        .eq('id', existing.id).select().single()
    } else {
      result = await supabase.from('time_entries')
        .insert({ user_id, date, clock_in: now, clock_out: null, periods: newPeriods })
        .select().single()
    }
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
    return NextResponse.json({ entry: result.data })
  }

  if (action === 'out') {
    if (!isClockedIn) return NextResponse.json({ error: 'No estás fichado' }, { status: 409 })
    const newPeriods = [...periods.slice(0, -1), { in: lastPeriod.in, out: now, photo_in: (lastPeriod as any).photo_in ?? null, photo_out: photo_url ?? null }]
    const { data, error } = await supabase.from('time_entries')
      .update({ periods: newPeriods, clock_out: now })
      .eq('id', existing.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ entry: data })
  }

  return NextResponse.json({ error: 'action must be in|out' }, { status: 400 })
}
