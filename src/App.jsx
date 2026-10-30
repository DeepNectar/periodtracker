import React, { useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured } from './supabase.js';
import { fetchLogsRemote, addLogRemote, removeLogRemote } from './sync.js';
import {
  KEYS, loadLogs, saveLogs, loadNumber, saveNumber,
} from './storage.js';
import {
  addDays, buildCycles, averageCycleLength, averagePeriodLength,
  predict, fmt, fmtLong, startOfToday,
} from './cycle.js';

const todayISO = () => {
  const t = new Date();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${t.getFullYear()}-${m}-${d}`;
};

export default function App() {
  const [logs, setLogs] = useState(loadLogs);
  const [cycleLength, setCycleLength] = useState(() =>
    loadNumber(KEYS.CYCLE_LENGTH_KEY, 28, 21, 40)
  );
  const [periodLength, setPeriodLength] = useState(() =>
    loadNumber(KEYS.PERIOD_LENGTH_KEY, 5, 2, 10)
  );
  const [autoDetect, setAutoDetect] = useState(true);
  const [customDate, setCustomDate] = useState(todayISO());
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  // Persist to localStorage whenever state changes
  useEffect(() => { saveLogs(logs); }, [logs]);
  useEffect(() => { saveNumber(KEYS.CYCLE_LENGTH_KEY, cycleLength); }, [cycleLength]);
  useEffect(() => { saveNumber(KEYS.PERIOD_LENGTH_KEY, periodLength); }, [periodLength]);

  // One-time pull from Supabase if configured (merge with local logs)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    (async () => {
      setSyncing(true);
      const remote = await fetchLogsRemote();
      if (cancelled) return;
      if (remote) {
        setLogs((prev) => [...new Set([...prev, ...remote])].sort());
        setSyncMsg('Synced with Supabase');
      } else {
        setSyncMsg('Supabase reachable? Using local data.');
      }
      setSyncing(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const cycles = useMemo(() => buildCycles(logs, periodLength), [logs, periodLength]);

  // Effective lengths: user setting, or auto-detected averages when enabled
  const detectedCycle = useMemo(() => averageCycleLength(cycles), [cycles]);
  const detectedPeriod = useMemo(() => averagePeriodLength(cycles), [cycles]);
  const effCycle = autoDetect && detectedCycle ? detectedCycle : cycleLength;
  const effPeriod = autoDetect && detectedPeriod ? detectedPeriod : periodLength;

  const lastStart = cycles.length ? cycles[cycles.length - 1].start : null;
  const p = useMemo(
    () => predict(lastStart, effCycle, effPeriod),
    [lastStart, effCycle, effPeriod]
  );

  const today = todayISO();
  const alreadyLoggedToday = logs.includes(today);

  function addLog(dateStr) {
    if (logs.includes(dateStr)) return;
    setLogs([...logs, dateStr].sort());
    addLogRemote(dateStr);
  }

  function removeLog(dateStr) {
    setLogs(logs.filter((l) => l !== dateStr));
    removeLogRemote(dateStr);
  }

  function statusLine() {
    if (!p) return { text: 'Log your first period day to see predictions.', cls: '' };
    if (p.isPeriodActiveNow) {
      return { text: `🩸 Period — Day ${p.dayOfCycle}`, cls: 'status-period' };
    }
    if (p.lateBy > 0) {
      return { text: `⚠️ Period late by ${p.lateBy} day${p.lateBy === 1 ? '' : 's'}`, cls: 'status-late' };
    }
    const inFertile =
      startOfToday() >= p.fertileStart && startOfToday() <= p.fertileEnd;
    if (inFertile) {
      return { text: `🌱 Fertile window — ovulation ~${fmt(p.ovulation)}`, cls: 'status-fertile' };
    }
    return { text: `Next period in ${p.daysUntilNext} day${p.daysUntilNext === 1 ? '' : 's'} (${fmt(p.nextStart)})`, cls: 'status-normal' };
  }

  const status = statusLine();

  return (
    <div className="app">
      <header>
        <h1>🌸 Period Tracker</h1>
        <p className={isSupabaseConfigured ? 'badge ok' : 'badge'}>
          {isSupabaseConfigured
            ? syncing ? 'Syncing…' : syncMsg || 'Supabase connected'
            : 'Demo mode (local storage)'}
        </p>
      </header>

      <main>
        <section className={`card status ${status.cls}`}>
          <h2>{status.text}</h2>
          {p && p.dayOfCycle && (
            <p className="muted">Cycle day {p.dayOfCycle} · avg cycle {effCycle} days · avg period {effPeriod} days</p>
          )}
        </section>

        <section className="card">
          <h2>Log a period day</h2>
          <div className="log-row">
            <button
              onClick={() => addLog(today)}
              disabled={alreadyLoggedToday}
            >
              {alreadyLoggedToday ? 'Logged today ✓' : "I have my period today"}
            </button>
          </div>
          <div className="log-row">
            <input
              type="date"
              value={customDate}
              max={today}
              onChange={(e) => setCustomDate(e.target.value)}
              aria-label="Period date"
            />
            <button
              onClick={() => addLog(customDate)}
              disabled={!customDate || customDate > today || logs.includes(customDate)}
            >
              Log this date
            </button>
          </div>
          {customDate > today && <p className="error">Future dates are not allowed.</p>}
        </section>

        <section className="card">
          <h2>Cycle settings</h2>
          <label className="check">
            <input
              type="checkbox"
              checked={autoDetect}
              onChange={(e) => setAutoDetect(e.target.checked)}
            />
            Auto-detect from my history {detectedCycle ? `(found: ${detectedCycle}-day cycle)` : '(need 2+ periods logged)'}
          </label>
          <label>
            Cycle length: <strong>{cycleLength}</strong> days
            <input
              type="range" min="21" max="40"
              value={cycleLength}
              disabled={autoDetect && detectedCycle}
              onChange={(e) => setCycleLength(Number(e.target.value))}
            />
          </label>
          <label>
            Period length: <strong>{periodLength}</strong> days
            <input
              type="range" min="2" max="10"
              value={periodLength}
              disabled={autoDetect && detectedPeriod}
              onChange={(e) => setPeriodLength(Number(e.target.value))}
            />
          </label>
        </section>

        <section className="card">
          <h2>Predictions</h2>
          {p ? (
            <ul className="predict">
              <li>🩸 Next period: <strong>{fmt(p.nextStart)} – {fmt(p.nextEnd)}</strong></li>
              <li>🥚 Ovulation (est.): <strong>{fmtLong(p.ovulation)}</strong></li>
              <li>🌱 Fertile window: <strong>{fmt(p.fertileStart)} – {fmt(p.fertileEnd)}</strong></li>
            </ul>
          ) : (
            <p>No predictions yet.</p>
          )}
        </section>

        <section className="card">
          <h2>History ({logs.length} day{logs.length === 1 ? '' : 's'})</h2>
          {logs.length === 0 ? (
            <p>No periods logged yet.</p>
          ) : (
            <>
              {cycles.length > 1 && (
                <p className="muted">Detected {cycles.length} cycles on average {detectedCycle ?? effCycle}-day spacing.</p>
              )}
              <ul className="history">
                {[...logs].reverse().map((l) => (
                  <li key={l}>
                    <span>{fmtLong(new Date(l + 'T00:00:00'))}</span>
                    <button className="del" onClick={() => removeLog(l)} aria-label={`Remove ${l}`}>✕</button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </main>

      <footer>Built with Vite + React · Deployed on Vercel ✅</footer>
    </div>
  );
}
