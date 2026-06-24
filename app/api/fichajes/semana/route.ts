import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const week_start = searchParams.get('week_start')
  if (!week_start) return NextResponse.json({ error: 'Missing week_start' }, { status: 400 })

  // week_start to week_end (7 days)
  const start = new Date(week_start + 'T12:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const week_end = end.toISOString().slice(0, 10)

  const [{ data: emps }, { data: entries }] = await Promise.all([
    supabaseAdmin.from('staff_users').select('id,name,role').order('name'),
    supabaseAdmin.from('time_entries').select('*').gte('date', week_start).lte('date', week_end),
  ])

  return NextResponse.json({ emps: emps ?? [], entries: entries ?? [] })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await supabaseAdmin.from('time_entries').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
