-- Migration: EAS Build (cloud) + EAS Submit
-- Run in Supabase SQL Editor if builds table already exists

ALTER TABLE builds ADD COLUMN IF NOT EXISTS eas_build_id TEXT;
ALTER TABLE builds ADD COLUMN IF NOT EXISTS submit_status TEXT;
ALTER TABLE builds ADD COLUMN IF NOT EXISTS submit_track TEXT;
