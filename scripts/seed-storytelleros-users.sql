-- Create grandfathered users table (no foreign key constraint)
-- These users get automatic active status when they sign in
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/ndbuijvewcsqziqhwtrp/sql

CREATE TABLE IF NOT EXISTS public.grandfathered_users (
  email TEXT PRIMARY KEY,
  getlate_profile_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow service role to read this table
ALTER TABLE public.grandfathered_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can read grandfathered users" ON public.grandfathered_users
  FOR SELECT USING (auth.role() = 'service_role');

-- Insert the StorytellerOS subscribers
INSERT INTO public.grandfathered_users (email, getlate_profile_id)
VALUES
  ('kaycorrellauthor@gmail.com', '697271fcd7502bb93174c3d4'),
  ('melanierachel.author@gmail.com', '697296f7b0a8d7675464d3bb'),
  ('melanierachel@melanierachelauthor.com', '697233c77406d4d229b1fad5'),
  ('brad@bradeldernovels.com', '6975072bc208419b944e1619'),
  ('getintouch@indieauthor.com', '697126013b5b9c7c753dddbf'),
  ('mhermannsen1@gmail.com', '69821296e40fdedc04fa993f'),
  ('tamerietherton@gmail.com', '6900ceb1f6c299cf11732b0c'),
  ('deborah@te-damedia.com', '6945a3288a34043aa2e78cc3'),
  ('chellehoniker@gmail.com', '693e1c89dfd29bf1b14013c5'),
  ('79franklinpress@gmail.com', '6972d336d4f42c2196fddbcc'),
  ('kim@kimberlydiedeauthor.com', '69839dc69797ac42033f69d1'),
  ('paul@paulaustinardoin.com', '6983992166995311078aac4e')
ON CONFLICT (email) DO UPDATE SET
  getlate_profile_id = EXCLUDED.getlate_profile_id;
