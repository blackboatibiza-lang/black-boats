import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { user_id, date, periods, preConverted } = await req.json()
  if (!user_id || !date) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // If preConverted, periods already contain ISO strings from the browser (correct local timezone)
  // Otherwise convert HH:MM assuming UTC (legacy)
  const toISO = (time: string) => time ? new Date(`${date}T${time}:00`).toISOString() : null

  const builtPeriods = preConverted
    ? (periods ?? []).filter((p: any) => p.in)
    : (periods ?? []).filter((p: any) => p.in).map((p: any) => ({ in: toISO(p.in)!, out: toISO(p.out) ?? null }))

  const clock_in  = builtPeriods[0]?.in ?? null
  const clock_out = builtPeriods.length === 1 ? (builtPeriods[0].out ?? null) : null

  const payload = {
    user_id,
    date,
    clock_in,
    clock_out: builtPeriods.length <= 1 ? clock_out : null,
    periods: builtPeriods.length > 1 ? builtPeriods : null,
  }

  const { data, error } = await supabaseAdmin
    .from('time_entries')
    .upsert(payload, { onConflict: 'user_id,date' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data })
}
