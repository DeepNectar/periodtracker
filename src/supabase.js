// Optional Supabase client. Reads env vars set in Vercel (Settings -> Environment Variables).
// If the env vars are missing or malformed, the app still runs in local demo mode.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function looksValid(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && !u.hostname.includes('your-project');
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && looksValid(supabaseUrl)
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
