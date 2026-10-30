import { useState } from 'react';
import { PeriodEntry } from '../lib/supabase';
import { formatShortDateTime, formatDuration } from '../utils/dates';
import { useToast } from './Toast';
import { Droplets, Edit3, Trash2, StopCircle, AlertTriangle, X } from 'lucide-react';

const SYMPTOMS = ['Cramps', 'Headache', 'Bloating', 'Fatigue', 'Mood swings', 'Back pain', 'Acne', 'Nausea', 'Insomnia', 'Cravings'];

type Props = {
  entries: PeriodEntry[];
  onEndPeriod: (id: string) => Promise<any>;
  onUpdateEntry: (id: string, updates: Partial<PeriodEntry>) => Promise<any>;
  onDeleteEntry: (id: string) => Promise<void>;
};

export function HistoryScreen({ entries, onEndPeriod, onUpdateEntry, onDeleteEntry }: Props) {
  const [confirmEnd, setConfirmEnd] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFlow, setEditFlow] = useState('');
  const [editSymptoms, setEditSymptoms] = useState<string[]>([]);
  const [editNotes, setEditNotes] = useState('');
  const { showToast } = useToast();

  const handleEnd = async (id: string) => {
    try {
      await onEndPeriod(id);
      showToast(`Period ended at ${formatShortDateTime(new Date().toISOString())}`);
      setConfirmEnd(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to end period', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeleteEntry(id);
      showToast('Entry deleted');
      setConfirmDelete(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete', 'error');
    }
  };

  const startEdit = (entry: PeriodEntry) => {
    setEditingId(entry.id);
    setEditFlow(entry.flow || 'Medium');
    setEditSymptoms(entry.symptoms || []);
    setEditNotes(entry.notes || '');
  };

  const saveEdit = async (id: string) => {
    try {
      await onUpdateEntry(id, { flow: editFlow as any, symptoms: editSymptoms, notes: editNotes || null });
      showToast('Entry updated');
      setEditingId(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to update', 'error');
    }
  };

  if (entries.length === 0) {
    return (
      <div className="px-4 pb-24 pt-6">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">History</h1>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300">No entries yet</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 text-center">Start tracking your period to see your history here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 pt-6">
      <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">History</h1>
      
      <div className="space-y-4">
        {entries.map(entry => (
          <div
            key={entry.id}
            className={`rounded-2xl p-4 border shadow-sm transition-all ${
              entry.status === 'active'
                ? 'bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20 border-pink-200 dark:border-pink-800'
                : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
            }`}
          >
            {editingId === entry.id ? (
              // Edit mode
              <div>
                <div className="mb-3">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Flow</label>
                  <div className="flex gap-2 mt-1">
                    {['Light', 'Medium', 'Heavy'].map(f => (
                      <button key={f} onClick={() => setEditFlow(f)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${editFlow === f ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-700' : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-transparent'}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-3">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Symptoms</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {SYMPTOMS.map(s => (
                      <button key={s} onClick={() => setEditSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                        className={`px-2 py-1 rounded-full text-[10px] font-medium ${editSymptoms.includes(s) ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)}
                  className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs text-gray-700 dark:text-gray-200 resize-none h-16 mb-3 focus:outline-none" />
                <div className="flex gap-2">
                  <button onClick={() => setEditingId(null)} className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium">Cancel</button>
                  <button onClick={() => saveEdit(entry.id)} className="flex-1 py-2 rounded-lg bg-pink-400 text-white text-xs font-medium">Save</button>
                </div>
              </div>
            ) : (
              // Display mode
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {entry.status === 'active' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-200 dark:bg-pink-800 text-pink-800 dark:text-pink-200 animate-pulse">
                          ACTIVE
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-medium">
                        {entry.status === 'completed' ? 'Completed' : 'In Progress'}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mt-1">
                      Start: {formatShortDateTime(entry.start_datetime)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      End: {entry.end_datetime ? formatShortDateTime(entry.end_datetime) : '— Ongoing —'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Duration: {formatDuration(entry.start_datetime, entry.end_datetime)}
                    </p>
                  </div>
                  {entry.flow && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Droplets size={12} /> {entry.flow}
                    </div>
                  )}
                </div>

                {/* Symptoms chips */}
                {entry.symptoms && entry.symptoms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {entry.symptoms.map(s => (
                      <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300">
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {entry.notes && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">"{entry.notes}"</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  {entry.status === 'active' && (
                    <button
                      onClick={() => setConfirmEnd(entry.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                    >
                      <StopCircle size={12} /> End Period
                    </button>
                  )}
                  <button
                    onClick={() => startEdit(entry)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Edit3 size={12} /> Edit
                  </button>
                  <button
                    onClick={() => setConfirmDelete(entry.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Confirm End Dialog */}
      {confirmEnd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">End Period?</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              This will record the current time as the end of your period. This action captures the exact timestamp.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmEnd(null)} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium text-sm">
                Cancel
              </button>
              <button onClick={() => handleEnd(confirmEnd)} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium text-sm">
                End Period
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">Delete Entry?</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              This entry will be permanently removed. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium text-sm">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium text-sm">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
