-- ============================================
-- BLACK BOATS - Schema de Base de Datos
-- ============================================

-- Tipos ENUM
CREATE TYPE boat_status AS ENUM ('available', 'rented', 'maintenance', 'inactive');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'active', 'completed', 'cancelled');
CREATE TYPE rental_type AS ENUM ('with_captain', 'bareboat');
CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'paid', 'refunded');

-- ============================================
-- FLOTA DE BARCOS
-- ============================================
CREATE TABLE boats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  model TEXT,
  type TEXT, -- velero, motor, catamarán, rib, etc.
  year INTEGER,
  length_meters DECIMAL(5,2),
  capacity INTEGER,
  cabins INTEGER DEFAULT 0,
  status boat_status DEFAULT 'available',
  hourly_rate DECIMAL(10,2),
  half_day_rate DECIMAL(10,2),
  full_day_rate DECIMAL(10,2),
  weekly_rate DECIMAL(10,2),
  deposit DECIMAL(10,2) DEFAULT 0,
  fuel_included BOOLEAN DEFAULT false,
  captain_required BOOLEAN DEFAULT false,
  description TEXT,
  notes TEXT,
  registration_number TEXT,
  insurance_expiry DATE,
  next_maintenance DATE,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CLIENTES
-- ============================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  nationality TEXT,
  id_number TEXT,
  id_type TEXT DEFAULT 'DNI', -- DNI, Passport, NIE
  boat_license TEXT,
  license_expiry DATE,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'España',
  notes TEXT,
  is_vip BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PERSONAL / PATRONES
-- ============================================
CREATE TABLE crew (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT DEFAULT 'captain', -- captain, hostess, mechanic, etc.
  email TEXT,
  phone TEXT,
  license_number TEXT,
  license_expiry DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EXTRAS / SERVICIOS
-- ============================================
CREATE TABLE extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  unit TEXT DEFAULT 'unidad', -- unidad, hora, día, persona
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extras por defecto
INSERT INTO extras (name, description, price, unit) VALUES
  ('Capitán', 'Patrón profesional incluido en la reserva', 250, 'día'),
  ('Combustible', 'Estimación de combustible según ruta', 0, 'variable'),
  ('Catering básico', 'Bebidas y snacks para la travesía', 80, 'unidad'),
  ('Catering premium', 'Comida y bebida gourmet', 200, 'unidad'),
  ('Transfer al barco', 'Traslado desde hotel al puerto', 50, 'trayecto'),
  ('Equipo de snorkel', 'Gafas, tubo y aletas por persona', 15, 'persona'),
  ('Paddle surf', 'Tabla de paddle surf', 30, 'unidad'),
  ('Flotador/Banana', 'Actividades acuáticas remolcadas', 100, 'hora'),
  ('Fotografía profesional', 'Fotógrafo a bordo', 300, 'día'),
  ('DJ / Música', 'DJ profesional para eventos', 500, 'día');

-- ============================================
-- RESERVAS
-- ============================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number TEXT UNIQUE NOT NULL DEFAULT 'BB-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 4),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  boat_id UUID REFERENCES boats(id) ON DELETE SET NULL,
  crew_id UUID REFERENCES crew(id) ON DELETE SET NULL,
  rental_type rental_type NOT NULL DEFAULT 'with_captain',
  status booking_status DEFAULT 'pending',
  
  -- Fechas y horarios
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME DEFAULT '09:00',
  end_time TIME DEFAULT '18:00',
  
  -- Pasajeros
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  
  -- Precios
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  extras_total DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Pago
  payment_status payment_status DEFAULT 'pending',
  
  -- Rutas y notas
  departure_port TEXT DEFAULT 'Ibiza Puerto',
  route_notes TEXT,
  internal_notes TEXT,
  
  -- Metadata
  source TEXT DEFAULT 'direct', -- direct, booking.com, airbnb, web, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EXTRAS POR RESERVA
-- ============================================
CREATE TABLE booking_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  extra_id UUID REFERENCES extras(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  notes TEXT
);

-- ============================================
-- PAGOS
-- ============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  method TEXT DEFAULT 'card', -- card, cash, transfer, stripe
  reference TEXT,
  notes TEXT,
  is_deposit BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MANTENIMIENTO DE BARCOS
-- ============================================
CREATE TABLE maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boat_id UUID REFERENCES boats(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE,
  completed_date DATE,
  cost DECIMAL(10,2) DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX idx_bookings_boat ON bookings(boat_id);
CREATE INDEX idx_bookings_client ON bookings(client_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_boats_status ON boats(status);
