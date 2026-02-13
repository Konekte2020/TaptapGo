-- Prix chofè: moto + machin (base, per km, per min)
-- Run in Supabase SQL Editor if tables already exist

-- Admins: prix par type de véhicule
ALTER TABLE admins ADD COLUMN IF NOT EXISTS base_fare_moto DECIMAL DEFAULT 0;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS base_fare_car DECIMAL DEFAULT 0;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS price_per_km_moto DECIMAL DEFAULT 0;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS price_per_km_car DECIMAL DEFAULT 0;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS price_per_min_moto DECIMAL DEFAULT 0;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS price_per_min_car DECIMAL DEFAULT 0;

-- Pricing settings (direct): moto + machin
ALTER TABLE pricing_settings ADD COLUMN IF NOT EXISTS base_fare_moto DECIMAL DEFAULT 0;
ALTER TABLE pricing_settings ADD COLUMN IF NOT EXISTS base_fare_car DECIMAL DEFAULT 0;
ALTER TABLE pricing_settings ADD COLUMN IF NOT EXISTS price_per_km_moto DECIMAL DEFAULT 0;
ALTER TABLE pricing_settings ADD COLUMN IF NOT EXISTS price_per_km_car DECIMAL DEFAULT 0;
ALTER TABLE pricing_settings ADD COLUMN IF NOT EXISTS price_per_min_moto DECIMAL DEFAULT 0;
ALTER TABLE pricing_settings ADD COLUMN IF NOT EXISTS price_per_min_car DECIMAL DEFAULT 0;
