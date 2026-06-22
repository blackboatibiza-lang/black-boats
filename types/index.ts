export type BoatStatus = 'available' | 'rented' | 'maintenance' | 'inactive'
export type BookingStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'
export type RentalType = 'with_captain' | 'bareboat'
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded'

export interface Boat {
  id: string
  name: string
  model?: string
  type?: string
  year?: number
  length_meters?: number
  capacity?: number
  cabins?: number
  status: BoatStatus
  hourly_rate?: number
  half_day_rate?: number
  full_day_rate?: number
  weekly_rate?: number
  deposit?: number
  fuel_included?: boolean
  captain_required?: boolean
  description?: string
  notes?: string
  registration_number?: string
  insurance_expiry?: string
  next_maintenance?: string
  image_url?: string
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  nationality?: string
  id_number?: string
  id_type?: string
  boat_license?: string
  license_expiry?: string
  address?: string
  city?: string
  country?: string
  notes?: string
  is_vip?: boolean
  created_at: string
  updated_at: string
}

export interface Crew {
  id: string
  first_name: string
  last_name: string
  role?: string
  email?: string
  phone?: string
  license_number?: string
  license_expiry?: string
  is_active?: boolean
  notes?: string
  created_at: string
}

export interface Extra {
  id: string
  name: string
  description?: string
  price: number
  unit?: string
  is_active?: boolean
  created_at: string
}

export interface Booking {
  id: string
  booking_number: string
  client_id?: string
  boat_id?: string
  crew_id?: string
  rental_type: RentalType
  status: BookingStatus
  start_date: string
  end_date: string
  start_time?: string
  end_time?: string
  adults?: number
  children?: number
  base_price: number
  extras_total?: number
  discount?: number
  total_price: number
  deposit_amount?: number
  payment_status: PaymentStatus
  departure_port?: string
  route_notes?: string
  internal_notes?: string
  source?: string
  created_at: string
  updated_at: string
  // joins
  client?: Client
  boat?: Boat
  crew?: Crew
  booking_extras?: BookingExtra[]
}

export interface BookingExtra {
  id: string
  booking_id: string
  extra_id?: string
  name: string
  quantity: number
  unit_price: number
  total: number
  notes?: string
}

export interface Payment {
  id: string
  booking_id: string
  amount: number
  payment_date: string
  method?: string
  reference?: string
  notes?: string
  is_deposit?: boolean
  created_at: string
}

export interface Maintenance {
  id: string
  boat_id: string
  title: string
  description?: string
  scheduled_date?: string
  completed_date?: string
  cost?: number
  is_completed?: boolean
  notes?: string
  created_at: string
}
