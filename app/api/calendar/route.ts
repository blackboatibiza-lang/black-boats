import { NextRequest, NextResponse } from 'next/server'
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar'

// POST /api/calendar — crear evento
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const eventId = await createCalendarEvent(body)
    return NextResponse.json({ eventId })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH /api/calendar — actualizar evento
export async function PATCH(req: NextRequest) {
  try {
    const { eventId, ...booking } = await req.json()
    if (!eventId) return NextResponse.json({ error: 'eventId requerido' }, { status: 400 })
    await updateCalendarEvent(eventId, booking)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE /api/calendar — eliminar evento
export async function DELETE(req: NextRequest) {
  try {
    const { eventId } = await req.json()
    if (!eventId) return NextResponse.json({ error: 'eventId requerido' }, { status: 400 })
    await deleteCalendarEvent(eventId)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
