import { format, differenceInDays, differenceInHours, differenceInMinutes, addDays, parseISO } from 'date-fns';

export function formatFullDateTime(isoString: string): string {
  const date = parseISO(isoString);
  return format(date, 'EEEE, d MMMM yyyy • hh:mm:ss a');
}

export function formatShortDateTime(isoString: string): string {
  const date = parseISO(isoString);
  return format(date, 'd MMM yyyy, hh:mm:ss a');
}

export function formatDuration(startISO: string, endISO: string | null): string {
  const start = parseISO(startISO);
  const end = endISO ? parseISO(endISO) : new Date();
  
  const days = differenceInDays(end, start);
  const hours = differenceInHours(end, start) % 24;
  const minutes = differenceInMinutes(end, start) % 60;
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
  parts.push(`${minutes} min`);
  
  return parts.join(', ');
}

export function getDaysBetween(date1: string, date2: string): number {
  return Math.abs(differenceInDays(parseISO(date1), parseISO(date2)));
}

export function predictNextPeriod(lastPeriodStart: string, avgCycleLength: number): string {
  const start = parseISO(lastPeriodStart);
  return addDays(start, avgCycleLength).toISOString();
}

export function predictFertileWindow(periodStart: string, avgCycleLength: number): { start: string; end: string } {
  const start = parseISO(periodStart);
  // Ovulation typically occurs 14 days before next period
  const ovulationDay = addDays(start, avgCycleLength - 14);
  const fertileStart = addDays(ovulationDay, -5);
  const fertileEnd = addDays(ovulationDay, 1);
  return {
    start: fertileStart.toISOString(),
    end: fertileEnd.toISOString()
  };
}

export function getCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];
  
  // Add padding for days before the first day of month
  const startPadding = firstDay.getDay();
  for (let i = startPadding - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }
  
  // Add all days of the month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }
  
  // Add padding after
  const endPadding = 6 - lastDay.getDay();
  for (let i = 1; i <= endPadding; i++) {
    days.push(new Date(year, month + 1, i));
  }
  
  return days;
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
}

export function isDateInRange(date: Date, startISO: string, endISO: string | null): boolean {
  const start = parseISO(startISO);
  const end = endISO ? parseISO(endISO) : new Date();
  const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const checkStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const checkEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return checkDate >= checkStart && checkDate <= checkEnd;
}
