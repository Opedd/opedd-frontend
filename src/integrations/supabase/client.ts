// Supabase client with hardcoded configuration
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = 'https://djdzcciayennqchjgybx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Bo2IasJ3unV64SvulezW3A_QJPfdyhf';

/**
 * KI #100 (closed 2026-05-05 Phase 5.11-γ Tier 2): Safari Private mode
 * isolates `localStorage` per-window, breaking the PKCE `code_verifier`
 * round-trip when the magic-link click opens in a different window
 * than where it was requested. Result: silent token-exchange failure.
 *
 * Per founder direction (option b3): UA-based blanket Safari detection
 * → implicit flow. Trade-off: regular (non-Private) Safari users (~15%
 * of web traffic) get implicit too, with sub-second token-in-URL-
 * fragment exposure during the redirect. Acceptable for soft-launch
 * threat model; KI #153 tracks long-term migration to precision
 * detection (async `navigator.storage.estimate` OR cross-window probe).
 *
 * Detection: classic Safari UA regex. Excludes Chrome/Android; matches
 * macOS+iOS Safari and iOS WebKit-based browsers (CriOS, FxiOS, EdgiOS
 * — all run WebKit per Apple's iOS policy, share the Private mode
 * storage behavior). Edge cases verified in client.test.ts.
 *
 * Exported for unit testing.
 */
export function shouldUseImplicitFlow(userAgent: string | undefined | null): boolean {
  if (!userAgent) return false;
  return /^((?!chrome|android).)*safari/i.test(userAgent);
}

const useImplicit =
  typeof window !== 'undefined' &&
  shouldUseImplicitFlow(window.navigator.userAgent);

// KI #80 (2026-05-01): flowType + detectSessionInUrl set explicitly
// to document the auth contract. detectSessionInUrl=true is required
// for AuthCallback.tsx (SDK auto-exchanges the magic-link code/token
// from the URL); changing it would re-introduce the abort race.
//
// KI #100 (2026-05-05): flowType is now conditional — implicit on
// Safari (any mode) to avoid Safari Private mode's localStorage
// per-window isolation breaking the PKCE code_verifier round-trip;
// PKCE everywhere else.
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    flowType: useImplicit ? 'implicit' : 'pkce',
    detectSessionInUrl: true,
  }
});
