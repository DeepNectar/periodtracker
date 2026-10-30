import { supabase } from '../lib/supabase';

export type LogType = 'daily' | 'intercourse' | 'exercise' | 'medication';

export interface DailyLog {
  id: string;
  log_date: string; // yyyy-MM-dd
  log_type: LogType;
  flow: string | null;
  symptoms: string[] | null;
  moods: string[] | null;
  pain_intensity: string | null;
  discharge: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function toDayKey(dateISO: string): string {
  return dateISO.slice(0, 10);
}

export function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Fetch all logs for a given UTC-offset-free local day key */
export async function fetchLogsForDay(dayKey: string): Promise<DailyLog[]> {
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('log_date', dayKey)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as DailyLog[];
}

/** Create or update the "daily" check-in log for a day (one per day) */
export async function saveDailyCheckIn(
  dayKey: string,
  fields: Partial<Pick<DailyLog, 'flow' | 'symptoms' | 'moods' | 'pain_intensity' | 'discharge' | 'notes'>>,
  existingId?: string | null
): Promise<DailyLog> {
  const now = new Date().toISOString();
  const payload: Record<string, any> = {
    log_date: dayKey,
    log_type: 'daily',
    updated_at: now,
    ...fields,
  };

  if (existingId) {
    const { data, error } = await supabase
      .from('daily_logs')
      .update(payload)
      .eq('id', existingId)
      .select()
      .single();
    if (error) throw error;
    return data as DailyLog;
  }

  const { data, error } = await supabase
    .from('daily_logs')
    .insert({ ...payload, created_at: now })
    .select()
    .single();
  if (error) throw error;
  return data as DailyLog;
}

/** Add an event-type log (intercourse / exercise / medication) for a day */
export async function addEventLog(
  dayKey: string,
  type: Exclude<LogType, 'daily'>,
  notes: string | null
): Promise<DailyLog> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('daily_logs')
    .insert({
      log_date: dayKey,
      log_type: type,
      notes,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();
  if (error) throw error;
  return data as DailyLog;
}

export async function deleteLog(id: string): Promise<void> {
  const { error } = await supabase.from('daily_logs').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Cycle phase helpers (for "what to expect" content) ----------

export interface PhaseInfo {
  phase: 'menstrual' | 'follicular' | 'fertile' | 'ovulation' | 'luteal';
  label: string;
  emoji: string;
  description: string;
}

/**
 * Determine where "today" falls within the predicted cycle using the last
 * period start and average cycle length / period duration.
 */
export function getCyclePhase(
  todayK: string,
  lastPeriodStartISO: string | null,
  avgCycleLength: number,
  avgPeriodDuration: number
): PhaseInfo | null {
  if (!lastPeriodStartISO) return null;
  const start = new Date(lastPeriodStartISO.slice(0, 10));
  const today = new Date(todayK);
  const dayOfCycle = Math.floor((today.getTime() - start.getTime()) / 86400000);
  if (dayOfCycle < 0) return null;

  const clampedCycle = Math.max(21, Math.min(45, avgCycleLength || 28));
  const pd = Math.max(2, Math.min(10, avgPeriodDuration || 5));
  const ovulationDay = clampedCycle - 14;
  const fertileStart = ovulationDay - 5;

  let phase: PhaseInfo['phase'];
  if (dayOfCycle < pd) phase = 'menstrual';
  else if (dayOfCycle < fertileStart) phase = 'follicular';
  else if (dayOfCycle < ovulationDay) phase = 'fertile';
  else if (dayOfCycle <= ovulationDay + 1) phase = 'ovulation';
  else phase = 'luteal';

  const map: Record<PhaseInfo['phase'], Omit<PhaseInfo, 'phase'>> = {
    menstrual: {
      label: 'Menstrual phase',
      emoji: '🌧️',
      description: 'Your period window. Energy may be low — rest, hydrate and eat iron-rich foods.',
    },
    follicular: {
      label: 'Follicular phase',
      emoji: '🌱',
      description: 'Estrogen is rising. Great time for new workouts, creative work and social plans.',
    },
    fertile: {
      label: 'Fertile window',
      emoji: '💗',
      description: 'Conception chances are increasing. Cervical mucus may become clearer and stretchier.',
    },
    ovulation: {
      label: 'Ovulation',
      emoji: '🥚',
      description: 'Most fertile days. You may feel a boost in energy and libido around now.',
    },
    luteal: {
      label: 'Luteal phase',
      emoji: '🌙',
      description: 'Progesterone rises. PMS symptoms like bloating or mood shifts may appear — go easy on yourself.',
    },
  };

  return { phase, ...map[phase] };
}
