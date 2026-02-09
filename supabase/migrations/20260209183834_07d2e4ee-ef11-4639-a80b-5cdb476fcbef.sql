
-- Add registration_path column to rss_sources
ALTER TABLE public.rss_sources
ADD COLUMN registration_path text NOT NULL DEFAULT 'newsletter_feed';

-- Add a comment for documentation
COMMENT ON COLUMN public.rss_sources.registration_path IS 'Distinguishes registration type: newsletter_feed, bulk_enterprise, single_work';
