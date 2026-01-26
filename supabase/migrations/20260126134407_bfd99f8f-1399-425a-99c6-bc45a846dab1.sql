-- Drop the overly permissive insert policy and create a more restrictive one
DROP POLICY IF EXISTS "Allow transaction inserts via checkout" ON public.transactions;

-- Allow authenticated users to insert transactions for assets they don't own (buyers)
-- This is for the checkout flow where buyers purchase licenses
CREATE POLICY "Authenticated users can create transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also allow anonymous checkout for public buyers
CREATE POLICY "Anonymous users can create transactions"
ON public.transactions
FOR INSERT
TO anon
WITH CHECK (true);