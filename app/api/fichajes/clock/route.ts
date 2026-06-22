import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { action, user_id, date } = await req.json()
  if (!action || !user_id || !date) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const supabase = createClient()
  const now = new Date().toISOString()

  const { data: existing } = await supabase
    .from('time_entries').select('*').eq('user_id', user_id).eq('date', date).single()

  if (action === 'in') {
    if (existing) return NextResponse.json({ error: 'Ya fichaste entrada hoy' }, { status: 409 })
    const { data, error } = await supabase.from('time_entries')
      .insert({ user_id, date, clock_in: now })
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ entry: data })
  }

  if (action === 'out') {
    if (!existing) return NextResponse.json({ error: 'No hay entrada fichada hoy' }, { status: 409 })
    if (existing.clock_out) return NextResponse.json({ error: 'Ya fichaste salida hoy' }, { status: 409 })
    const { data, error } = await supabase.from('time_entries')
      .update({ clock_out: now })
      .eq('id', existing.id)
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ entry: data })
  }

  return NextResponse.json({ error: 'action must be in|out' }, { status: 400 })
}
