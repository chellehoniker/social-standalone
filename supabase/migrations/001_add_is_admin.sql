-- Add is_admin column to profiles table
-- Run this in Supabase SQL Editor

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Set admin flag for master account
UPDATE public.profiles
SET is_admin = TRUE
WHERE email = 'chelle@atheniacreative.com';

-- Create index for efficient admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = TRUE;
