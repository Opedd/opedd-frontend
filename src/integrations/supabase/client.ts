// Supabase client with safe initialization
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://dmmvaiupksamhgefdxev.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtbXZhaXVwa3NhbWhnZWZkeGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjQ4ODEsImV4cCI6MjA4NDYwMDg4MX0.C4tYevZ6-2lv8E4iPsE8cVn9y1r1Y1O5cVr_XlDQwZo';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

let supabase: SupabaseClient<Database>;

try {
  supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    }
  });
} catch (error) {
  console.error('[Supabase] Failed to initialize client:', error);
  // Create a minimal client that won't crash the app
  supabase = createClient<Database>(
    'https://dmmvaiupksamhgefdxev.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtbXZhaXVwa3NhbWhnZWZkeGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjQ4ODEsImV4cCI6MjA4NDYwMDg4MX0.C4tYevZ6-2lv8E4iPsE8cVn9y1r1Y1O5cVr_XlDQwZo'
  );
}

export { supabase };
