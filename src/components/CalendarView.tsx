import { useState, useMemo } from 'react';
import { PeriodEntry } from '../lib/supabase';
import { getCalendarDays, isSameDay, isDateInRange, predictNextPeriod, predictFertileWindow } from '../utils/dates';
import { format, parseISO, isBefore, isAfter, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  entries: PeriodEntry[];
};

export function CalendarView({ entries }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const days = useMemo(() => getCalendarDays(year, month), [year, month]);

  const completedEntries = entries.filter(e => e.status === 'completed' && e.end_datetime);
  const activeEntry = entries.find(e => e.status === 'active');

  // Calculate avg cycle length for predictions
  const cycleLengths: number[] = [];
  for (let i = 0; i < completedEntries.length - 1; i++) {
    const days = Math.round((new Date(completedEntries[i].start_datetime).getTime() - new Date(completedEntries[i + 1].start_datetime).getTime()) / (1000 * 60 * 60 * 24));
    if (days > 0 && days < 60) cycleLengths.push(days);
  }
  const avgCycle = cycleLengths.length > 0 ? Math.round(cycleLengths.slice(0, 6).reduce((a, b) => a + b, 0) / Math.min(cycleLengths.length, 6)) : 28;

  // Get predicted periods
  const predictions = useMemo(() => {
    if (completedEntries.length === 0 && !activeEntry) return [];
    const lastStart = entries.length > 0 ? parseISO(entries[0].start_datetime) : null;
    if (!lastStart) return [];
    
    const preds: { start: Date; end: Date }[] = [];
    for (let i = 1; i <= 6; i++) {
      const predStart = new Date(lastStart);
      predStart.setDate(predStart.getDate() + (avgCycle * i));
      const predEnd = new Date(predStart);
      predEnd.setDate(predEnd.getDate() + 5); // avg 5 day period
      preds.push({ start: predStart, end: predEnd });
    }
    return preds;
  }, [entries, avgCycle, completedEntries.length, activeEntry]);

  // Get fertile windows
  const fertileWindows = useMemo(() => {
    if (completedEntries.length === 0 && !activeEntry) return [];
    const lastStart = entries.length > 0 ? parseISO(entries[0].start_datetime) : null;
    if (!lastStart) return [];
    
    const windows: { start: Date; end: Date }[] = [];
    for (let i = 0; i <= 5; i++) {
      const predStart = new Date(lastStart);
      predStart.setDate(predStart.getDate() + (avgCycle * i));
      const { start, end } = predictFertileWindow(predStart.toISOString(), avgCycle);
      windows.push({ start: parseISO(start), end: parseISO(end) });
    }
    return windows;
  }, [entries, avgCycle, completedEntries.length, activeEntry]);

  const getDayStatus = (day: Date) => {
    const today = startOfDay(new Date());
    
    // Check actual period days
    for (const entry of entries) {
      if (isDateInRange(day, entry.start_datetime, entry.end_datetime)) {
        return 'period';
      }
    }
    
    // Check if it's a future predicted day
    if (isAfter(day, today) || isSameDay(day, today)) {
      for (const pred of predictions) {
        const predStart = startOfDay(pred.start);
        const predEnd = startOfDay(pred.end);
        const checkDay = startOfDay(day);
        if (checkDay >= predStart && checkDay <= predEnd) {
          return 'predicted';
        }
      }
      
      // Check fertile window
      for (const fw of fertileWindows) {
        const fwStart = startOfDay(fw.start);
        const fwEnd = startOfDay(fw.end);
        const checkDay = startOfDay(day);
        if (checkDay >= fwStart && checkDay <= fwEnd) {
          return 'fertile';
        }
      }
    }
    
    return 'none';
  };

  const getEntryForDay = (day: Date) => {
    return entries.find(e => isDateInRange(day, e.start_datetime, e.end_datetime));
  };

  const selectedEntry = selectedDay ? getEntryForDay(selectedDay) : null;

  return (
    <div className="px-4 pb-24 pt-6">
      <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Calendar</h1>
      
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentMonth(new Date(year, month - 1))} className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
          <ChevronLeft size={18} className="text-gray-600 dark:text-gray-300" />
        </button>
        <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button onClick={() => setCurrentMonth(new Date(year, month + 1))} className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
          <ChevronRight size={18} className="text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-gray-400 dark:text-gray-500 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          const status = getDayStatus(day);
          const isCurrentMonth = day.getMonth() === month;
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          
          return (
            <button
              key={idx}
              onClick={() => setSelectedDay(day)}
              className={`aspect-square rounded-xl flex items-center justify-center text-xs font-medium transition-all relative ${
                !isCurrentMonth ? 'text-gray-300 dark:text-gray-600' :
                isSelected ? 'ring-2 ring-pink-400 dark:ring-pink-500' : ''
              } ${
                status === 'period' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' :
                status === 'predicted' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                status === 'fertile' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                'text-gray-600 dark:text-gray-300'
              } ${isToday ? 'ring-2 ring-pink-300 dark:ring-pink-600' : ''}`}
            >
              {day.getDate()}
              {status === 'period' && <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-red-400" />}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-200 dark:bg-red-900/50" />
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Period</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-200 dark:bg-yellow-900/50" />
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Predicted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-200 dark:bg-green-900/50" />
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Fertile</span>
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="mt-4 rounded-2xl p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            {format(selectedDay, 'EEEE, d MMMM yyyy')}
          </h3>
          {selectedEntry ? (
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p>🩸 Period day</p>
              <p>Flow: {selectedEntry.flow || 'Not logged'}</p>
              {selectedEntry.symptoms && selectedEntry.symptoms.length > 0 && (
                <p>Symptoms: {selectedEntry.symptoms.join(', ')}</p>
              )}
              {selectedEntry.notes && <p className="italic">"{selectedEntry.notes}"</p>}
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {getDayStatus(selectedDay) === 'predicted' ? '🟡 Predicted period day' :
               getDayStatus(selectedDay) === 'fertile' ? '🟢 Fertile window' :
               'No data for this day'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
