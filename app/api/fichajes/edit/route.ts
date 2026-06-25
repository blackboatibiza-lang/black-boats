import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { user_id, date, periods, preConverted, entry_id } = await req.json()
  if (!user_id || !date) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

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

  let result
  if (entry_id) {
    // Update existing entry by ID — avoids upsert creating duplicate rows
    result = await supabaseAdmin
      .from('time_entries')
      .update(payload)
      .eq('id', entry_id)
      .select()
      .single()
  } else {
    // Check if entry already exists for this user+date
    const { data: existing } = await supabaseAdmin
      .from('time_entries')
      .select('id')
      .eq('user_id', user_id)
      .eq('date', date)
      .maybeSingle()

    if (existing) {
      result = await supabaseAdmin
        .from('time_entries')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single()
    } else {
      result = await supabaseAdmin
        .from('time_entries')
        .insert(payload)
        .select()
        .single()
    }
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
  return NextResponse.json({ entry: result.data })
}
