-- Create waitlist table for early access signups
CREATE TABLE public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Newsletter', 'Media Co', 'Indie Publisher', 'Enterprise')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public waitlist signup)
CREATE POLICY "Anyone can join waitlist"
ON public.waitlist
FOR INSERT
WITH CHECK (true);

-- Prevent reading/updating/deleting (admin only via dashboard)
CREATE POLICY "No public read access"
ON public.waitlist
FOR SELECT
USING (false);