-- Add accessible_profile_ids column for multi-profile (pen name) support
-- This stores additional GetLate profile IDs that a user can access

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS accessible_profile_ids TEXT[] DEFAULT NULL;

-- Add a comment to explain the column
COMMENT ON COLUMN public.profiles.accessible_profile_ids IS
  'Additional GetLate profile IDs this user can access (for pen name/multi-profile support)';
