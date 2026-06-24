import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const user_id  = searchParams.get('user_id')
  const week_start = searchParams.get('week_start')

  if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })

  let q = supabaseAdmin.from('schedules').select('*').eq('user_id', user_id)
  if (week_start) q = q.eq('week_start', week_start)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ schedules: data ?? [] })
}
