import { supabase, isSupabaseConfigured } from './supabase.js';

const TABLE = 'period_logs';

/** Fetch logs from Supabase. Returns null if not configured or on error (caller falls back to localStorage). */
export async function fetchLogsRemote() {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select('log_date')
    .order('log_date', { ascending: true });
  if (error) {
    console.warn('Supabase fetch failed, using local data:', error.message);
    return null;
  }
  return data.map((r) => r.log_date);
}

/** Persist a single log date. Best-effort; failures are logged but don't break the UI. */
export async function addLogRemote(dateStr) {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from(TABLE).insert({ log_date: dateStr });
  if (error) console.warn('Supabase insert failed (kept locally):', error.message);
}

export async function removeLogRemote(dateStr) {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('log_date', dateStr);
  if (error) console.warn('Supabase delete failed:', error.message);
}
