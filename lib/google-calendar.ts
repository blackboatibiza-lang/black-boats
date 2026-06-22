import { google } from 'googleapis'

// Google Calendar colorId por nombre de barco
const BOAT_COLOR_MAP: { match: string; colorId: string }[] = [
  { match: 'sessa',    colorId: '5'  }, // Banana — amarillo
  { match: 'joel',     colorId: '7'  }, // Peacock — turquesa
  { match: 'cattleya', colorId: '8'  }, // Graphite — gris oscuro
  { match: 'quick',    colorId: '2'  }, // Sage — verde menta
  { match: 'arendel',  colorId: '3'  }, // Grape — lila
  { match: 'moto',     colorId: '4'  }, // Flamingo — rosa
  { match: 'maretti',  colorId: '10' }, // Basil — verde manzana
]

export function getColorIdForBoat(boatName: string): string {
  const n = (boatName ?? '').toLowerCase()
  const found = BOAT_COLOR_MAP.find(x => n.includes(x.match))
  return found ? found.colorId : '1' // Lavender por defecto
}

function getCalendarClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY no configurada')

  const key = JSON.parse(raw)
  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })
  return google.calendar({ version: 'v3', auth })
}

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? 'primary'

export async function createCalendarEvent(booking: {
  id: string
  booking_number: string
  start_date: string
  end_date: string
  start_time?: string | null
  end_time?: string | null
  client_name: string
  boat_name: string
  total_price: number
  adults?: number
  rental_type?: string
  departure_port?: string
}): Promise<string | null> {
  try {
    const cal = getCalendarClient()

    const startDateTime = `${booking.start_date}T${booking.start_time ?? '09:00:00'}`
    const endDateTime   = `${booking.end_date}T${booking.end_time ?? '18:00:00'}`

    const description = [
      `Cliente: ${booking.client_name}`,
      `Barco: ${booking.boat_name}`,
      `Importe: ${booking.total_price.toLocaleString('es-ES')}€`,
      booking.adults ? `Pax: ${booking.adults}` : '',
      booking.rental_type === 'with_captain' ? 'Con patrón' : 'Sin patrón',
      booking.departure_port ? `Puerto: ${booking.departure_port}` : '',
    ].filter(Boolean).join('\n')

    const { data } = await cal.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        summary: `🚤 ${booking.booking_number} — ${booking.client_name} · ${booking.boat_name}`,
        description,
        start: { dateTime: startDateTime, timeZone: 'Europe/Madrid' },
        end:   { dateTime: endDateTime,   timeZone: 'Europe/Madrid' },
        colorId: getColorIdForBoat(booking.boat_name),
      },
    })

    return data.id ?? null
  } catch (e) {
    console.error('Google Calendar createEvent error:', e)
    return null
  }
}

export async function updateCalendarEvent(eventId: string, booking: {
  booking_number: string
  start_date: string
  end_date: string
  start_time?: string | null
  end_time?: string | null
  client_name: string
  boat_name: string
  total_price: number
  adults?: number
  rental_type?: string
  departure_port?: string
}): Promise<void> {
  try {
    const cal = getCalendarClient()

    const startDateTime = `${booking.start_date}T${booking.start_time ?? '09:00:00'}`
    const endDateTime   = `${booking.end_date}T${booking.end_time ?? '18:00:00'}`

    const description = [
      `Cliente: ${booking.client_name}`,
      `Barco: ${booking.boat_name}`,
      `Importe: ${booking.total_price.toLocaleString('es-ES')}€`,
      booking.adults ? `Pax: ${booking.adults}` : '',
      booking.rental_type === 'with_captain' ? 'Con patrón' : 'Sin patrón',
      booking.departure_port ? `Puerto: ${booking.departure_port}` : '',
    ].filter(Boolean).join('\n')

    await cal.events.update({
      calendarId: CALENDAR_ID,
      eventId,
      requestBody: {
        summary: `🚤 ${booking.booking_number} — ${booking.client_name} · ${booking.boat_name}`,
        description,
        start: { dateTime: startDateTime, timeZone: 'Europe/Madrid' },
        end:   { dateTime: endDateTime,   timeZone: 'Europe/Madrid' },
        colorId: getColorIdForBoat(booking.boat_name),
      },
    })
  } catch (e) {
    console.error('Google Calendar updateEvent error:', e)
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  try {
    const cal = getCalendarClient()
    await cal.events.delete({ calendarId: CALENDAR_ID, eventId })
  } catch (e) {
    console.error('Google Calendar deleteEvent error:', e)
  }
}
