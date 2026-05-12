// Phase 8.6 — Step2Api local types.
//
// Mirrors Step2Ghost/types.ts shape (Phase 7.5 ship) — same ViewMode +
// FieldHighlight axis, different field semantics: Step2Api creates an
// API key (vs verify-ownership cascade); state machine is identical.
//
// View-prop types live here so the parallel views (URLEntryView,
// ActiveView, SuccessView, FailureBanner) share a single import.

// State machine view modes. URL_ENTRY handles failure inline (banner
// above primary button); no separate failure view per locked UX spec.
// 'url_entry' name preserved from sibling-pattern lineage even though
// Step2Api's entry view doesn't take a URL (it takes environment +
// optional name). The state-machine semantic — "publisher input
// phase" — is identical; renaming would diverge from the canonical
// Step2Ghost / Step2Beehiiv reference architecture for no real gain.
export type ViewMode = 'url_entry' | 'active' | 'success';

// Field-highlight axis for failure banners. Maps to which input field
// gets the warning border. 'environment' or 'name' for single-field
// failures; 'none' for backend errors with no identifiable field cause.
// 'both' is unused for Step2Api (only 2 fields and they're never both
// the cause; backend Zod schema on /publishers-api-keys treats
// environment as required, name as optional).
export type FieldHighlight = 'environment' | 'name' | 'none';

// Phase 8 canonical error codes from /publishers-api-keys responses
// (source-verified against opedd-backend _shared/response-envelope.ts
// ErrorCode taxonomy: 12 entries; Step2Api hits a subset). Used by
// FailureBanner.deriveBannerCopy to map error code → publisher-facing
// copy + field highlight.
export type ApiKeyCreateErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'INTERNAL'
  | 'INVALID_REQUEST';
