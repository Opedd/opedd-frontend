// Supabase client with hardcoded configuration
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = 'https://djdzcciayennqchjgybx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZHpjY2lheWVubnFjaGpneWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MTEyODIsImV4cCI6MjA4NDQ4NzI4Mn0.yy8AU2uOMMjqyGsjWLNlzsUp93Z9UQ7N-PRe90qDG3E';

// KI #80 (2026-05-01): flowType + detectSessionInUrl set explicitly
// to document the auth contract. Both values are the SDK defaults;
// we set them to make the contract visible at the call site and to
// pin them against future SDK-default changes. AuthCallback.tsx
// relies on detectSessionInUrl=true (SDK auto-exchanges the magic-link
// code from the URL); changing it would re-introduce the abort race.
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    flowType: 'pkce',
    detectSessionInUrl: true,
  }
});
