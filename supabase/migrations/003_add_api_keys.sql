-- Add API key support to profiles table
-- Keys are stored as SHA-256 hashes only (never plaintext)

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS api_key_hash TEXT DEFAULT NULL;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS api_key_created_at TIMESTAMPTZ DEFAULT NULL;

-- Partial index for fast key lookups (only rows that have a key)
CREATE INDEX IF NOT EXISTS idx_profiles_api_key_hash
ON public.profiles(api_key_hash)
WHERE api_key_hash IS NOT NULL;

COMMENT ON COLUMN public.profiles.api_key_hash IS
  'SHA-256 hash of the user API key for external automation (Make.com, Zapier, n8n)';

COMMENT ON COLUMN public.profiles.api_key_created_at IS
  'Timestamp when the current API key was generated';
