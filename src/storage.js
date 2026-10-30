import { isValidISODate } from './cycle.js';

const CYCLE_LENGTH_KEY = 'pt_cycle_length';
const PERIOD_LENGTH_KEY = 'pt_period_length';
const LOGS_KEY = 'pt_logs';

/**
 * Storage layer with corruption-safe parsing and validation.
 * Logs are stored as an array of unique 'YYYY-MM-DD' strings, sorted ascending.
 */
export function loadLogs() {
  try {
    const raw = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    const valid = [...new Set(raw.filter(isValidISODate))].sort();
    return valid;
  } catch {
    return [];
  }
}

export function saveLogs(logs) {
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

export function loadNumber(key, fallback, min, max) {
  const n = Number(localStorage.getItem(key));
  if (!Number.isFinite(n) || n < min || n > max) return fallback;
  return n;
}

export function saveNumber(key, value) {
  localStorage.setItem(key, String(value));
}

export const KEYS = { CYCLE_LENGTH_KEY, PERIOD_LENGTH_KEY, LOGS_KEY };
