// Phase 6.5 — Step2Beehiiv local types.
//
// Re-exports the BeehiivVerifyReason enum from `@/lib/api` for proximity
// (consumers in this directory don't need to reach across the api
// surface for a type that's specific to their semantic domain). View-
// prop types live here too so the parallel views (URLEntryView,
// ActiveView, SuccessView, FailureBanner) share a single import.

export type { BeehiivVerifyReason } from '@/lib/api';

// State machine view modes. URL_ENTRY handles failure inline (banner
// above primary button); no separate failure view per locked UX spec.
export type ViewMode = 'url_entry' | 'active' | 'success';

// Field-highlight axis for failure banners. Maps to which input field
// gets the warning border. 'both' covers the 400 INVALID_PAYLOAD case
// where both fields were missing; 'none' covers Beehiiv-side errors
// where neither field is identifiably the cause.
export type FieldHighlight = 'api_key' | 'pub_id' | 'both' | 'none';
