-- Add verification_status column to assets table for publication verification tracking
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified'));

-- Add verification_token column to store the token for each asset
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS verification_token text;

-- Add content_hash column for license schema alignment
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS content_hash text;

-- Add metadata column for additional license data (JSONB for flexibility)
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Add license_type column to explicitly store the license type
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS license_type text DEFAULT 'standard';

-- Add publication_id column to link assets to their parent publication
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS publication_id uuid REFERENCES public.assets(id) ON DELETE SET NULL;

-- Create index on publication_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_assets_publication_id ON public.assets(publication_id);

-- Create index on verification_status for filtering
CREATE INDEX IF NOT EXISTS idx_assets_verification_status ON public.assets(verification_status);