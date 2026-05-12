// Step2Api local types. Mirrors Step2Ghost/types.ts state-machine
// shape with different field semantics: Step2Api creates an API key
// (vs verify-ownership cascade).

// State machine view modes. URL_ENTRY handles failure inline (banner
// above primary button); no separate failure view per locked UX spec.
// Name preserved for canonical Step2 sibling pattern.
export type ViewMode = 'url_entry' | 'active' | 'success';

// Field-highlight axis for failure banners. Maps to which input field
// gets the warning border. 'name' for single-field failure; 'none' for
// backend errors with no identifiable field cause.
export type FieldHighlight = 'name' | 'none';

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
