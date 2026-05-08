// Phase 7.5 — Step2Ghost local types.
//
// Re-exports the GhostVerifyReason enum from `@/lib/api` for proximity
// (consumers in this directory don't need to reach across the api
// surface for a type that's specific to their semantic domain). View-
// prop types live here too so the parallel views (URLEntryView,
// ActiveView, SuccessView, FailureBanner) share a single import.
//
// Mirrors Step2Beehiiv/types.ts shape (Phase 6.5 ship at commit
// dbcf12e) — same ViewMode + FieldHighlight axis, different field
// names per Ghost credentials shape (site_url + admin_api_key vs
// Beehiiv's api_key + pub_id).

export type { GhostVerifyReason } from '@/lib/api';

// State machine view modes. URL_ENTRY handles failure inline (banner
// above primary button); no separate failure view per locked UX spec
// per design doc § 4 + § 8.1.
export type ViewMode = 'url_entry' | 'active' | 'success';

// Field-highlight axis for failure banners. Maps to which input field
// gets the warning border. 'both' covers the 400 INVALID_PAYLOAD case
// where both fields were missing; 'none' covers Ghost-side errors
// where neither field is identifiably the cause.
export type FieldHighlight = 'site_url' | 'admin_api_key' | 'both' | 'none';
