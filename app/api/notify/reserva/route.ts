import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPush } from '@/lib/push'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { booking_id, client_name, boat_name, date, total_price } = await req.json()

  // Get all admin push subscriptions
  const { data: admins } = await supabaseAdmin
    .from('staff_users')
    .select('id')
    .eq('role', 'admin')
    .eq('active', true)

  if (!admins?.length) return NextResponse.json({ ok: true, notified: 0 })

  const adminIds = admins.map((a: any) => a.id)
  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*')
    .in('user_id', adminIds)

  if (!subs?.length) return NextResponse.json({ ok: true, notified: 0 })

  const expired: string[] = []
  let notified = 0

  for (const sub of subs) {
    try {
      await sendPush(sub.subscription, {
        title: '🚢 Nueva reserva',
        body: `${client_name} · ${boat_name} · ${date}${total_price ? ` · ${Number(total_price).toLocaleString('es-ES')}€` : ''}`,
        tag: `reserva-${booking_id}`,
        url: booking_id ? `/reservas/${booking_id}` : '/reservas',
      })
      notified++
    } catch (e: any) {
      if (e.message === 'SUBSCRIPTION_EXPIRED') expired.push(sub.user_id)
    }
  }

  if (expired.length) {
    await supabaseAdmin.from('push_subscriptions').delete().in('user_id', expired)
  }

  return NextResponse.json({ ok: true, notified })
}
