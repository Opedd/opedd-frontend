
-- Allow anonymous/public SELECT on assets for the public checkout page
CREATE POLICY "Public can view assets for licensing"
ON public.assets
FOR SELECT
USING (true);

-- Table for issued license keys
CREATE TABLE public.issued_licenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id uuid NOT NULL REFERENCES public.assets(id),
  license_type text NOT NULL DEFAULT 'human',
  licensee_email text NOT NULL,
  license_key text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.issued_licenses ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public checkout)
CREATE POLICY "Anyone can create issued licenses"
ON public.issued_licenses
FOR INSERT
WITH CHECK (true);

-- Asset owners can view licenses issued for their content
CREATE POLICY "Asset owners can view issued licenses"
ON public.issued_licenses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.assets WHERE assets.id = issued_licenses.asset_id AND assets.user_id = auth.uid()
  )
);
