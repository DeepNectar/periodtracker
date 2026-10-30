import { useEffect, useMemo, useState } from 'react';
import { PeriodEntry } from '../lib/supabase';
import { useToast } from './Toast';
import {
  FLOW_OPTIONS,
  SYMPTOM_OPTIONS,
  MOOD_OPTIONS,
  INTENSITY_OPTIONS,
  DISCHARGE_OPTIONS,
} from '../lib/constants';
import {
  DailyLog,
  todayKey,
  fetchLogsForDay,
  saveDailyCheckIn,
  addEventLog,
  deleteLog,
  getCyclePhase,
} from '../utils/dailyLog';
import { calculateCycleStats } from '../utils/dates';
import { buildPredictions, countdownLabel } from '../utils/predictions';
import { format } from 'date-fns';
import { CalendarPlus, Heart, Pill, Dumbbell, Trash2, Save } from 'lucide-react';

interface Props {
  entries: PeriodEntry[];
  onStartPeriod: (flow: string | null, symptoms: string[], notes: string | null) => Promise<any>;
}

const EVENT_META: Record<string, { label: string; emoji: string }> = {
  intercourse: { label: 'Intercourse', emoji: '💞' },
  exercise: { label: 'Exercise', emoji: '🏃‍♀️' },
  medication: { label: 'Medication', emoji: '💊' },
};

export function TodayScreen({ entries, onStartPeriod }: Props) {
  const { showToast } = useToast();
  const dayKey = useMemo(() => todayKey(), []);

  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Check-in form state
  const [flow, setFlow] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [moods, setMoods] = useState<string[]>([]);
  const [pain, setPain] = useState<string | null>(null);
  const [discharge, setDischarge] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Quick-add modal
  const [quickType, setQuickType] = useState<'intercourse' | 'exercise' | 'medication' | null>(null);
  const [quickNotes, setQuickNotes] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchLogsForDay(dayKey);
      setLogs(data);
      const daily = data.find((l) => l.log_type === 'daily');
      if (daily) {
        setFlow(daily.flow);
        setSymptoms(daily.symptoms || []);
        setMoods(daily.moods || []);
        setPain(daily.pain_intensity);
        setDischarge(daily.discharge);
        setNotes(daily.notes || '');
      }
    } catch (e: any) {
      showToast('Could not load today\'s log: ' + (e?.message || ''), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey]);

  const stats = useMemo(() => calculateCycleStats(entries), [entries]);
  const predictions = useMemo(() => buildPredictions(entries), [entries]);
  const phase = useMemo(
    () => getCyclePhase(dayKey, predictions.lastPeriodStart, stats.avgCycleLength, stats.avgPeriodDuration),
    [dayKey, predictions.lastPeriodStart, stats]
  );

  const dailyLog = logs.find((l) => l.log_type === 'daily') || null;
  const eventLogs = logs.filter((l) => l.log_type !== 'daily');

  const hasAnyField = flow || symptoms.length || moods.length || pain || discharge || notes.trim();

  const handleSave = async () => {
    if (!hasAnyField) {
      showToast('Add something to your check-in first 🙂', 'info');
      return;
    }
    try {
      setSaving(true);
      await saveDailyCheckIn(
        dayKey,
        {
          flow,
          symptoms,
          moods,
          pain_intensity: pain,
          discharge,
          notes: notes.trim() || null,
        },
        dailyLog?.id
      );
      await load();
      showToast('Today saved! ✅', 'success');
    } catch (e: any) {
      showToast('Save failed: ' + (e?.message || 'Please run the daily_logs migration'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAdd = async () => {
    if (!quickType) return;
    try {
      await addEventLog(dayKey, quickType, quickNotes.trim() || null);
      await load();
      showToast(`${EVENT_META[quickType].emoji} ${EVENT_META[quickType].label} logged`, 'success');
      setQuickType(null);
      setQuickNotes('');
    } catch (e: any) {
      showToast('Could not log: ' + (e?.message || 'Please run the daily_logs migration'), 'error');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteLog(id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
    } catch (e: any) {
      showToast('Delete failed', 'error');
    }
  };

  const toggle = (arr: string[], value: string, setter: (v: string[]) => void) => {
    setter(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  };

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
      active
        ? 'bg-pink-500 text-white border-pink-500'
        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-pink-300'
    }`;

  return (
    <div className="px-4 pb-28 pt-4 space-y-4 max-w-lg mx-auto">
      {/* Header / date */}
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-pink-400 font-semibold">Today</p>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
          {format(new Date(dayKey), 'EEEE, d MMMM')}
        </h2>
      </div>

      {/* Status card: period prediction + current phase */}
      <div className="bg-gradient-to-br from-pink-500 to-purple-500 rounded-3xl p-5 text-white shadow-lg">
        {predictions.hasData ? (
          <>
            <p className="text-xs opacity-80">Next period</p>
            <p className="text-lg font-bold">{countdownLabel(predictions.daysUntilNextPeriod)}</p>
            {phase && (
              <div className="mt-3 bg-white/15 rounded-2xl p-3">
                <p className="text-sm font-semibold">
                  {phase.emoji} You're in your {phase.label.toLowerCase()}
                </p>
                <p className="text-xs opacity-90 mt-1">{phase.description}</p>
              </div>
            )}
          </>
        ) : (
          <div>
            <p className="text-sm font-semibold">Start tracking to see your predictions</p>
            <button
              onClick={() => onStartPeriod(null, [], null)}
              className="mt-3 inline-flex items-center gap-2 bg-white text-pink-600 px-4 py-2 rounded-xl text-sm font-semibold"
            >
              <CalendarPlus size={16} /> Start my period
            </button>
          </div>
        )}
      </div>

      {/* What to expect */}
      {phase && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-sm border border-pink-100 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-2">
            💡 What to expect right now
          </h3>
          <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1 list-disc pl-4">
            {phase.phase === 'menstrual' && (
              <>
                <li>Cramping and fatigue are normal — gentle movement can help.</li>
                <li>Stay hydrated; iron-rich foods replace what's lost.</li>
              </>
            )}
            {phase.phase === 'follicular' && (
              <>
                <li>Energy is likely rising — a good window for intense workouts.</li>
                <li>Skin may clear up as estrogen climbs.</li>
              </>
            )}
            {(phase.phase === 'fertile' || phase.phase === 'ovulation') && (
              <>
                <li>Peak fertility days — note changes in cervical mucus.</li>
                <li>If avoiding pregnancy, use protection on these days.</li>
              </>
            )}
            {phase.phase === 'luteal' && (
              <>
                <li>PMS like bloating or mood shifts may show up.</li>
                <li>Prioritise sleep and lower-intensity exercise.</li>
              </>
            )}
          </ul>
        </div>
      )}

      {/* Quick actions */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-sm border border-pink-100 dark:border-gray-700">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">Quick log</h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setQuickType('intercourse')}
            className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-300 text-xs font-medium hover:bg-rose-100 transition-colors"
          >
            <Heart size={18} /> Intercourse
          </button>
          <button
            onClick={() => setQuickType('exercise')}
            className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 text-xs font-medium hover:bg-purple-100 transition-colors"
          >
            <Dumbbell size={18} /> Exercise
          </button>
          <button
            onClick={() => setQuickType('medication')}
            className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300 text-xs font-medium hover:bg-amber-100 transition-colors"
          >
            <Pill size={18} /> Medication
          </button>
        </div>

        {eventLogs.length > 0 && (
          <div className="mt-3 space-y-2">
            {eventLogs.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2"
              >
                <span className="text-xs text-gray-700 dark:text-gray-200">
                  {EVENT_META[l.log_type]?.emoji} {EVENT_META[l.log_type]?.label}
                  {l.notes ? ` — ${l.notes}` : ''}
                </span>
                <button
                  onClick={() => handleDeleteEvent(l.id)}
                  className="text-gray-400 hover:text-red-400"
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Daily check-in */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-sm border border-pink-100 dark:border-gray-700 space-y-4">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">📝 How was your day?</h3>

        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Spotting / flow</p>
          <div className="flex flex-wrap gap-2">
            {FLOW_OPTIONS.map((f) => (
              <button key={f} onClick={() => setFlow(flow === f ? null : f)} className={chip(flow === f)}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Symptoms</p>
          <div className="flex flex-wrap gap-2">
            {SYMPTOM_OPTIONS.slice(0, 8).map((s) => (
              <button key={s} onClick={() => toggle(symptoms, s, setSymptoms)} className={chip(symptoms.includes(s))}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Mood</p>
          <div className="flex flex-wrap gap-2">
            {MOOD_OPTIONS.map((m) => (
              <button
                key={m.label}
                onClick={() => toggle(moods, m.label, setMoods)}
                className={`${chip(moods.includes(m.label))} flex items-center gap-1`}
              >
                <span>{m.emoji}</span> {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Pain level</p>
            <div className="flex flex-wrap gap-2">
              {INTENSITY_OPTIONS.map((i) => (
                <button key={i} onClick={() => setPain(pain === i ? null : i)} className={chip(pain === i)}>
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Discharge</p>
            <div className="flex flex-wrap gap-2">
              {DISCHARGE_OPTIONS.slice(0, 4).map((d) => (
                <button key={d} onClick={() => setDischarge(discharge === d ? null : d)} className={chip(discharge === d)}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Notes</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else about today…"
            rows={3}
            className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3 focus:outline-none focus:ring-2 focus:ring-pink-300 text-gray-800 dark:text-gray-100 resize-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-semibold disabled:opacity-60"
        >
          <Save size={16} /> {dailyLog ? 'Update today\'s check-in' : 'Save today\'s check-in'}
        </button>
      </div>

      {/* Quick-add modal */}
      {quickType && (
        <div className="fixed inset-0 z-[300] bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setQuickType(null)}>
          <div
            className="bg-white dark:bg-gray-800 w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-base font-bold text-gray-800 dark:text-gray-100">
              {EVENT_META[quickType].emoji} Log {EVENT_META[quickType].label.toLowerCase()}
            </h4>
            <textarea
              value={quickNotes}
              onChange={(e) => setQuickNotes(e.target.value)}
              placeholder="Optional notes (e.g. type, dosage)…"
              rows={3}
              className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3 focus:outline-none focus:ring-2 focus:ring-pink-300 text-gray-800 dark:text-gray-100 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setQuickType(null);
                  setQuickNotes('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickAdd}
                className="flex-1 py-2.5 rounded-xl bg-pink-500 text-white text-sm font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
