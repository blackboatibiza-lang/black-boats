import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'Missing date' }, { status: 400 })

  const d = new Date(date + 'T12:00:00')
  const dayOfWeek = (d.getDay() + 6) % 7
  const getWeekStart = (d: Date) => {
    const date = new Date(d)
    const day = date.getDay()
    date.setDate(date.getDate() - ((day + 6) % 7))
    date.setHours(0, 0, 0, 0)
    return date
  }
  const ws = getWeekStart(d).toISOString().slice(0, 10)

  const [{ data: emps }, { data: entries }, { data: scheds }] = await Promise.all([
    supabaseAdmin.from('staff_users').select('id,name,role').order('name'),
    supabaseAdmin.from('time_entries').select('*').eq('date', date),
    supabaseAdmin.from('schedules').select('*').eq('week_start', ws).eq('day_of_week', dayOfWeek),
  ])

  return NextResponse.json({ emps: emps ?? [], entries: entries ?? [], scheds: scheds ?? [] })
}
