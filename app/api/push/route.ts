import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// POST — save or update push subscription for a user
export async function POST(req: NextRequest) {
  const { user_id, subscription } = await req.json()
  if (!user_id || !subscription) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const supabase = createClient()
  await supabase.from('push_subscriptions').upsert({ user_id, subscription }, { onConflict: 'user_id' })
  return NextResponse.json({ ok: true })
}

// DELETE — remove subscription
export async function DELETE(req: NextRequest) {
  const { user_id } = await req.json()
  const supabase = createClient()
  await supabase.from('push_subscriptions').delete().eq('user_id', user_id)
  return NextResponse.json({ ok: true })
}
