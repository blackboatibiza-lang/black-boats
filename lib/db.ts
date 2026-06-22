import { createClient } from './supabase'
import type { Boat, Client, Crew, Extra, Booking, Payment, Maintenance } from '@/types'

// ── BARCOS ──────────────────────────────────────────────
export async function getBoats() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('boats')
    .select('*')
    .order('name')
  if (error) throw error
  return data as Boat[]
}

export async function getBoat(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('boats')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Boat
}

export async function createBoat(boat: Partial<Boat>) {
  const supabase = createClient()
  const { data, error } = await supabase.from('boats').insert(boat).select().single()
  if (error) throw error
  return data as Boat
}

export async function updateBoat(id: string, boat: Partial<Boat>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('boats').update({ ...boat, updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) throw error
  return data as Boat
}

export async function deleteBoat(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('boats').delete().eq('id', id)
  if (error) throw error
}

// ── CLIENTES ────────────────────────────────────────────
export async function getClients() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*, bookings(count)')
    .order('last_name')
  if (error) throw error
  return data
}

export async function getClient(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*, bookings(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createClient_(client: Partial<Client>) {
  const supabase = createClient()
  const { data, error } = await supabase.from('clients').insert(client).select().single()
  if (error) throw error
  return data as Client
}

export async function updateClient(id: string, client: Partial<Client>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients').update({ ...client, updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) throw error
  return data as Client
}

// ── TRIPULACIÓN ─────────────────────────────────────────
export async function getCrew() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crew')
    .select('*')
    .order('last_name')
  if (error) throw error
  return data as Crew[]
}

export async function createCrewMember(member: Partial<Crew>) {
  const supabase = createClient()
  const { data, error } = await supabase.from('crew').insert(member).select().single()
  if (error) throw error
  return data as Crew
}

export async function updateCrewMember(id: string, member: Partial<Crew>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crew').update(member).eq('id', id).select().single()
  if (error) throw error
  return data as Crew
}

// ── EXTRAS ──────────────────────────────────────────────
export async function getExtras() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('extras')
    .select('*')
    .order('name')
  if (error) throw error
  return data as Extra[]
}

export async function createExtra(extra: Partial<Extra>) {
  const supabase = createClient()
  const { data, error } = await supabase.from('extras').insert(extra).select().single()
  if (error) throw error
  return data as Extra
}

export async function updateExtra(id: string, extra: Partial<Extra>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('extras').update(extra).eq('id', id).select().single()
  if (error) throw error
  return data as Extra
}

// ── RESERVAS ────────────────────────────────────────────
export async function getBookings() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('bookings')
    .select('*, client:clients(id,first_name,last_name), boat:boats(id,name), crew:crew(id,first_name,last_name)')
    .order('start_date', { ascending: false })
  if (error) throw error
  return data as Booking[]
}

export async function getBooking(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('bookings')
    .select('*, client:clients(*), boat:boats(*), crew:crew(*), booking_extras(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Booking
}

export async function createBooking(booking: Partial<Booking>) {
  const supabase = createClient()
  const { data, error } = await supabase.from('bookings').insert(booking).select().single()
  if (error) throw error
  return data as Booking
}

export async function updateBooking(id: string, booking: Partial<Booking>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('bookings').update({ ...booking, updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) throw error
  return data as Booking
}

// ── PAGOS ───────────────────────────────────────────────
export async function getPayments() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*, booking:bookings(booking_number, client:clients(first_name, last_name))')
    .order('payment_date', { ascending: false })
  if (error) throw error
  return data as Payment[]
}

export async function createPayment(payment: Partial<Payment>) {
  const supabase = createClient()
  const { data, error } = await supabase.from('payments').insert(payment).select().single()
  if (error) throw error
  return data as Payment
}

// ── MANTENIMIENTO ────────────────────────────────────────
export async function getMaintenance() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('maintenance')
    .select('*, boat:boats(name)')
    .order('scheduled_date', { ascending: true })
  if (error) throw error
  return data as Maintenance[]
}

export async function createMaintenance(task: Partial<Maintenance>) {
  const supabase = createClient()
  const { data, error } = await supabase.from('maintenance').insert(task).select().single()
  if (error) throw error
  return data as Maintenance
}

export async function updateMaintenance(id: string, task: Partial<Maintenance>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('maintenance').update(task).eq('id', id).select().single()
  if (error) throw error
  return data as Maintenance
}

// ── DASHBOARD ────────────────────────────────────────────
export async function getDashboardStats() {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const [boats, bookingsToday, paymentsToday] = await Promise.all([
    supabase.from('boats').select('status'),
    supabase.from('bookings')
      .select('*, client:clients(first_name,last_name), boat:boats(name)')
      .gte('start_date', today)
      .lte('start_date', today)
      .neq('status', 'cancelled'),
    supabase.from('payments')
      .select('amount')
      .gte('payment_date', today)
      .lte('payment_date', today),
  ])

  const boatCounts = {
    total: boats.data?.length ?? 0,
    available: boats.data?.filter(b => b.status === 'available').length ?? 0,
    rented: boats.data?.filter(b => b.status === 'rented').length ?? 0,
    maintenance: boats.data?.filter(b => b.status === 'maintenance').length ?? 0,
  }

  const todayRevenue = paymentsToday.data?.reduce((s, p) => s + Number(p.amount), 0) ?? 0

  // Ingresos del día también estimados desde reservas activas/confirmadas de hoy
  const todayRevenueFromBookings = (bookingsToday.data ?? []).reduce(
    (s: number, b: any) => s + Number(b.total_price ?? 0), 0
  )

  return {
    boatCounts,
    bookingsToday: bookingsToday.data ?? [],
    todayRevenue,
    todayRevenueFromBookings,
  }
}
