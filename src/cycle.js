// Pure cycle-calculation helpers — no React, easy to test.

export const MS_PER_DAY = 86400000;

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Start of today (local time), used for dedupe & day math. */
export function startOfToday() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

/** Whole days from `from` (inclusive-of-today semantics) until `to`. */
export function daysBetween(fromDate, toDate) {
  const a = new Date(fromDate); a.setHours(0, 0, 0, 0);
  const b = new Date(toDate); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / MS_PER_DAY);
}

/**
 * Group logged period-start dates into cycles.
 * A new cycle starts when the gap from the previous log exceeds
 * max(periodLength, 7) days; otherwise consecutive logs extend the
 * current period's flow days.
 * Returns array of { start: Date, end: Date, flowDays: number }.
 */
export function buildCycles(logs, periodLength) {
  const sorted = [...logs]
    .map((d) => new Date(d))
    .filter((d) => !isNaN(d))
    .sort((a, b) => a - b);

  const cycles = [];
  let cur = null;
  const gapThreshold = Math.max(periodLength, 7);

  for (const d of sorted) {
    if (!cur || daysBetween(cur.end, d) > gapThreshold) {
      cur = { start: d, end: d, flowDays: 1 };
      cycles.push(cur);
    } else {
      cur.end = d;
      cur.flowDays += 1;
    }
  }
  return cycles;
}

/** Average cycle length (start-to-start) across recorded cycles. */
export function averageCycleLength(cycles) {
  if (cycles.length < 2) return null;
  let sum = 0;
  for (let i = 1; i < cycles.length; i++) {
    sum += daysBetween(cycles[i - 1].start, cycles[i].start);
  }
  const avg = Math.round(sum / (cycles.length - 1));
  return avg >= 15 && avg <= 60 ? avg : null; // sanity bound
}

/** Average period (flow) length across recorded cycles. */
export function averagePeriodLength(cycles) {
  if (!cycles.length) return null;
  const sum = cycles.reduce((acc, c) => acc + c.flowDays, 0);
  return Math.round(sum / cycles.length);
}

/**
 * Predictions based on last known start + effective lengths.
 * Ovulation estimated at (cycleLength - 14) days after period start
 * (luteal phase ≈ 14 days). Fertile window = 5 days before ovulation
 * through ovulation day.
 */
export function predict(lastStart, cycleLength, periodLength, today = startOfToday()) {
  if (!lastStart) return null;

  const nextStart = addDays(lastStart, cycleLength);
  const nextEnd = addDays(nextStart, periodLength - 1);
  const ovulation = addDays(lastStart, cycleLength - 14);
  const fertileStart = addDays(ovulation, -5);
  const fertileEnd = new Date(ovulation);

  const daysUntilNext = daysBetween(today, nextStart);
  const dayOfCycle = daysBetween(today, lastStart) * -1 + 1; // 1-based
  const isPeriodActiveNow = dayOfCycle >= 1 && dayOfCycle <= periodLength;

  // If we're past the predicted start, show the most recent projected window
  const upcomingStart = daysUntilNext < 0 ? addDays(nextStart, cycleLength) : nextStart;

  return {
    nextStart: daysUntilNext < 0 ? upcomingStart : nextStart,
    nextEnd: daysUntilNext < 0 ? addDays(upcomingStart, periodLength - 1) : nextEnd,
    ovulation,
    fertileStart,
    fertileEnd,
    daysUntilNext,
    dayOfCycle: dayOfCycle > 0 ? dayOfCycle : null,
    isPeriodActiveNow,
    lateBy: daysUntilNext < 0 ? -daysUntilNext : 0,
  };
}

export function fmt(date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function fmtLong(date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function isValidISODate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00');
  return !isNaN(d.getTime());
}
