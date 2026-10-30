import { useState } from 'react';
import { LiveClock } from './LiveClock';
import { useToast } from './Toast';
import { PeriodEntry } from '../lib/supabase';
import { formatShortDateTime, formatDuration } from '../utils/dates';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Droplets, Clock, Calendar, ChevronRight } from 'lucide-react';

const SYMPTOMS = ['Cramps', 'Headache', 'Bloating', 'Fatigue', 'Mood swings', 'Back pain', 'Acne', 'Nausea', 'Insomnia', 'Cravings'];

type Props = {
  activeEntry: PeriodEntry | null;
  entries: PeriodEntry[];
  onStartPeriod: (flow: string | null, symptoms: string[], notes: string | null) => Promise<any>;
};

export function HomeScreen({ activeEntry, entries, onStartPeriod }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [flow, setFlow] = useState<string>('Medium');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const completedEntries = entries.filter(e => e.status === 'completed' && e.end_datetime);
  
  // Calculate stats
  const cycleLengths: number[] = [];
  for (let i = 0; i < completedEntries.length - 1; i++) {
    const days = Math.round((new Date(completedEntries[i].start_datetime).getTime() - new Date(completedEntries[i + 1].start_datetime).getTime()) / (1000 * 60 * 60 * 24));
    if (days > 0 && days < 60) cycleLengths.push(days);
  }
  const avgCycle = cycleLengths.length > 0 ? Math.round(cycleLengths.slice(0, 6).reduce((a, b) => a + b, 0) / Math.min(cycleLengths.length, 6)) : null;
  
  const lastStart = entries.length > 0 ? parseISO(entries[0].start_datetime) : null;
  const currentCycleDay = lastStart ? differenceInDays(new Date(), lastStart) + 1 : null;
  const nextPredicted = avgCycle && lastStart ? format(new Date(lastStart.getTime() + avgCycle * 24 * 60 * 60 * 1000), 'd MMM yyyy') : null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onStartPeriod(flow, selectedSymptoms, notes || null);
      showToast(`Period started at ${formatShortDateTime(new Date().toISOString())}`);
      setShowForm(false);
      setFlow('Medium');
      setSelectedSymptoms([]);
      setNotes('');
    } catch (err: any) {
      showToast(err.message || 'Failed to start period', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSymptom = (s: string) => {
    setSelectedSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  return (
    <div className="px-4 pb-24 pt-2">
      <LiveClock />
      
      {/* Status Card */}
      <div className="mt-4 rounded-3xl p-6 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 border border-pink-100 dark:border-pink-900/30 shadow-sm">
        {activeEntry ? (
          <div className="text-center">
            <div className="text-4xl mb-3">🩸</div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Period Ongoing</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Started {formatShortDateTime(activeEntry.start_datetime)}
            </p>
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 text-sm font-medium">
              <Clock size={14} />
              {formatDuration(activeEntry.start_datetime, null)}
            </div>
            {activeEntry.flow && (
              <div className="mt-3 flex items-center justify-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <Droplets size={14} /> {activeEntry.flow} flow
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className="text-4xl mb-3">🌸</div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">No Active Period</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tap below when your period starts</p>
          </div>
        )}
      </div>

      {/* Start Button */}
      {!activeEntry && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mt-4 w-full py-4 rounded-2xl bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 text-white font-semibold text-base shadow-lg shadow-pink-200 dark:shadow-pink-900/30 transition-all duration-200 active:scale-[0.98]"
        >
          🩸 Start Period
        </button>
      )}

      {/* Start Form */}
      {showForm && !activeEntry && (
        <div className="mt-4 rounded-3xl p-5 bg-white dark:bg-gray-800 border border-pink-100 dark:border-gray-700 shadow-sm animate-fade-in">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Log Period Start</h3>
          
          {/* Flow */}
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Flow</label>
            <div className="flex gap-2 mt-2">
              {['Light', 'Medium', 'Heavy'].map(f => (
                <button
                  key={f}
                  onClick={() => setFlow(f)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    flow === f
                      ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 border-2 border-pink-300 dark:border-pink-700'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-2 border-transparent'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Symptoms */}
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Symptoms</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {SYMPTOMS.map(s => (
                <button
                  key={s}
                  onClick={() => toggleSymptom(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedSymptoms.includes(s)
                      ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="How are you feeling?"
              className="mt-2 w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-700"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-400 to-rose-400 text-white font-medium text-sm shadow-md disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save & Start'}
            </button>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-center shadow-sm">
          <Calendar size={16} className="mx-auto text-pink-400 mb-1" />
          <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{currentCycleDay || '—'}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Cycle Day</p>
        </div>
        <div className="rounded-2xl p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-center shadow-sm">
          <Clock size={16} className="mx-auto text-purple-400 mb-1" />
          <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{avgCycle || '—'}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Avg Cycle</p>
        </div>
        <div className="rounded-2xl p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-center shadow-sm">
          <ChevronRight size={16} className="mx-auto text-rose-400 mb-1" />
          <p className="text-[11px] font-bold text-gray-800 dark:text-gray-100 leading-tight">{nextPredicted || '—'}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Next Period</p>
        </div>
      </div>

      {/* Privacy note */}
      <div className="mt-6 text-center">
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          🔒 Synced securely to your private cloud. Accessible only on devices with this app.
        </p>
      </div>
    </div>
  );
}
