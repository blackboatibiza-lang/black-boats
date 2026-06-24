import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { booking_id } = await req.json()
  if (!booking_id) return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 })

  const supabase = createClient()

  // Return existing contract if already created
  const { data: existing } = await supabase
    .from('contracts').select('token').eq('booking_id', booking_id).maybeSingle()
  if (existing) return NextResponse.json({ token: existing.token })

  const { data, error } = await supabase
    .from('contracts').insert({ booking_id }).select('token').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ token: data.token })
}
