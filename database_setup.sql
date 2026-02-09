-- TapTapGo Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Passengers table
CREATE TABLE IF NOT EXISTS passengers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    city TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    profile_photo TEXT,
    admin_id UUID,
    moncash_enabled BOOLEAN DEFAULT FALSE,
    moncash_phone TEXT,
    natcash_enabled BOOLEAN DEFAULT FALSE,
    natcash_phone TEXT,
    wallet_balance DECIMAL DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add payment method columns if table already exists
ALTER TABLE passengers
  ADD COLUMN IF NOT EXISTS moncash_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE passengers
  ADD COLUMN IF NOT EXISTS moncash_phone TEXT;
ALTER TABLE passengers
  ADD COLUMN IF NOT EXISTS natcash_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE passengers
  ADD COLUMN IF NOT EXISTS natcash_phone TEXT;
ALTER TABLE passengers
  ADD COLUMN IF NOT EXISTS admin_id UUID;

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    city TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    vehicle_brand TEXT NOT NULL,
    vehicle_model TEXT NOT NULL,
    vehicle_color TEXT,
    plate_number TEXT UNIQUE NOT NULL,
    vehicle_photo TEXT,
    license_photo TEXT,
    vehicle_papers TEXT,
    profile_photo TEXT,
    status TEXT DEFAULT 'pending',
    is_online BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    current_lat DECIMAL,
    current_lng DECIMAL,
    rating DECIMAL DEFAULT 5.0,
    total_rides INTEGER DEFAULT 0,
    wallet_balance DECIMAL DEFAULT 0,
    moncash_enabled BOOLEAN DEFAULT FALSE,
    moncash_phone TEXT,
    natcash_enabled BOOLEAN DEFAULT FALSE,
    natcash_phone TEXT,
    bank_enabled BOOLEAN DEFAULT FALSE,
    bank_name TEXT,
    bank_account_name TEXT,
    bank_account_number TEXT,
    default_method TEXT,
    admin_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admins table (white-label)
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    cities TEXT[] DEFAULT '{}',
    brand_name TEXT,
    logo TEXT,
    primary_color TEXT DEFAULT '#E53935',
    secondary_color TEXT DEFAULT '#1E3A5F',
    tertiary_color TEXT DEFAULT '#F4B400',
    commission_rate DECIMAL DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE admins ADD COLUMN IF NOT EXISTS tertiary_color TEXT DEFAULT '#F4B400';

-- SuperAdmins table
CREATE TABLE IF NOT EXISTS superadmins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cities table
CREATE TABLE IF NOT EXISTS cities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    base_fare_moto DECIMAL DEFAULT 50,
    base_fare_car DECIMAL DEFAULT 100,
    price_per_km_moto DECIMAL DEFAULT 25,
    price_per_km_car DECIMAL DEFAULT 50,
    price_per_min_moto DECIMAL DEFAULT 5,
    price_per_min_car DECIMAL DEFAULT 10,
    surge_multiplier DECIMAL DEFAULT 1.0,
    system_commission DECIMAL DEFAULT 15,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rides table
CREATE TABLE IF NOT EXISTS rides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passenger_id UUID REFERENCES passengers(id),
    driver_id UUID REFERENCES drivers(id),
    pickup_lat DECIMAL NOT NULL,
    pickup_lng DECIMAL NOT NULL,
    pickup_address TEXT NOT NULL,
    destination_lat DECIMAL NOT NULL,
    destination_lng DECIMAL NOT NULL,
    destination_address TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    assigned_at TIMESTAMP WITH TIME ZONE,
    driver_eta_minutes INTEGER,
    contact_code TEXT,
    contact_active BOOLEAN DEFAULT FALSE,
    estimated_distance DECIMAL,
    estimated_duration DECIMAL,
    estimated_price DECIMAL,
    final_price DECIMAL,
    payment_method TEXT DEFAULT 'cash',
    passenger_rating INTEGER,
    driver_rating INTEGER,
    passenger_comment TEXT,
    driver_comment TEXT,
    city TEXT,
    admin_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancel_reason TEXT
);

-- Add driver vehicle color column if table already exists
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS vehicle_color TEXT;
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS moncash_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS moncash_phone TEXT;
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS natcash_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS natcash_phone TEXT;
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS bank_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT;
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS default_method TEXT;

-- Add ride assignment/contact columns if table already exists
ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS driver_eta_minutes INTEGER;
ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS contact_code TEXT;
ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS contact_active BOOLEAN DEFAULT FALSE;

-- OTP codes table
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Favorite addresses table
CREATE TABLE IF NOT EXISTS favorite_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    user_type TEXT NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    lat DECIMAL NOT NULL,
    lng DECIMAL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    user_type TEXT NOT NULL,
    amount DECIMAL NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    ride_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE superadmins ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Builds table (APK builds)
CREATE TABLE IF NOT EXISTS builds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'queued',
    progress INTEGER DEFAULT 0,
    message TEXT,
    apk_path TEXT,
    apk_url TEXT,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_builds_brand_id ON builds(brand_id);
CREATE INDEX IF NOT EXISTS idx_builds_status ON builds(status);

ALTER TABLE builds ENABLE ROW LEVEL SECURITY;

-- Create policies to allow access (for development - tighten in production)
DROP POLICY IF EXISTS "Allow all access to passengers" ON passengers;
DROP POLICY IF EXISTS "Allow all access to drivers" ON drivers;
DROP POLICY IF EXISTS "Allow all access to admins" ON admins;
DROP POLICY IF EXISTS "Allow all access to superadmins" ON superadmins;
DROP POLICY IF EXISTS "Allow all access to cities" ON cities;
DROP POLICY IF EXISTS "Allow all access to rides" ON rides;
DROP POLICY IF EXISTS "Allow all access to otp_codes" ON otp_codes;
DROP POLICY IF EXISTS "Allow all access to favorite_addresses" ON favorite_addresses;
DROP POLICY IF EXISTS "Allow all access to transactions" ON transactions;
DROP POLICY IF EXISTS "Allow all access to builds" ON builds;

CREATE POLICY "Allow all access to passengers" ON passengers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to drivers" ON drivers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to admins" ON admins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to superadmins" ON superadmins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to cities" ON cities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to rides" ON rides FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to otp_codes" ON otp_codes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to favorite_addresses" ON favorite_addresses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to builds" ON builds FOR ALL USING (true) WITH CHECK (true);

-- Insert default cities for Haiti
INSERT INTO cities (name, base_fare_moto, base_fare_car, price_per_km_moto, price_per_km_car, price_per_min_moto, price_per_min_car, surge_multiplier, system_commission)
VALUES 
    ('Port-au-Prince', 50, 100, 25, 50, 5, 10, 1.0, 15),
    ('Cap-Haïtien', 45, 90, 22, 45, 4, 8, 1.0, 15),
    ('Gonaïves', 40, 85, 20, 40, 4, 8, 1.0, 15),
    ('Les Cayes', 40, 85, 20, 40, 4, 8, 1.0, 15),
    ('Pétion-Ville', 55, 110, 28, 55, 6, 12, 1.2, 15),
    ('Delmas', 50, 100, 25, 50, 5, 10, 1.0, 15),
    ('Carrefour', 45, 95, 23, 48, 5, 10, 1.0, 15),
    ('Jacmel', 45, 90, 22, 45, 4, 8, 1.0, 15)
ON CONFLICT (name) DO NOTHING;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
