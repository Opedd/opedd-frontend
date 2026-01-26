-- Create transactions table for tracking license purchases
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  publisher_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  license_type TEXT NOT NULL DEFAULT 'human',
  status TEXT NOT NULL DEFAULT 'pending',
  story_protocol_hash TEXT,
  buyer_email TEXT
);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Publishers can view their own transactions
CREATE POLICY "Publishers can view own transactions"
ON public.transactions
FOR SELECT
USING (auth.uid() = publisher_id);

-- Allow public inserts for checkout (with publisher_id check via asset)
CREATE POLICY "Allow transaction inserts via checkout"
ON public.transactions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.assets 
    WHERE assets.id = asset_id 
    AND assets.user_id = publisher_id
  )
);

-- Publishers can update their own transactions
CREATE POLICY "Publishers can update own transactions"
ON public.transactions
FOR UPDATE
USING (auth.uid() = publisher_id);

-- Add index for faster lookups
CREATE INDEX idx_transactions_publisher_id ON public.transactions(publisher_id);
CREATE INDEX idx_transactions_asset_id ON public.transactions(asset_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);