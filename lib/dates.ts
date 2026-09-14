import type { Period } from './types';

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function monthParts(month: string): [number, number] {
  return [Number(month.slice(0, 4)), Number(month.slice(5, 7))];
}

/** `2026-09` → `September 2026`. */
export function monthLabel(month: string): string {
  const [year, monthNumber] = monthParts(month);
  return `${monthNames[monthNumber - 1]} ${year}`;
}

/** `2026-09` shifted by `direction` months. */
export function moveMonth(month: string, direction: number): string {
  const [year, monthNumber] = monthParts(month);
  const index = year * 12 + monthNumber - 1 + direction;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/** Adds calendar days to a YYYY-MM-DD key without reading the local timezone. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
}

/** A `Date` → the `YYYY-MM-DD` key used throughout, in local time. */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Today as a `YYYY-MM-DD` key. */
export function todayKey(): string {
  return toDateKey(new Date());
}

/** The current calendar month as `YYYY-MM`, in local time. */
export function currentMonth(): string {
  return todayKey().slice(0, 7);
}

/** `2026-09-07` → `7 Sep`. Noon anchors the parse away from the date boundary. */
export function formatDayMonth(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

/** `2026-09-07` → `07 Sep 2026`. */
export function formatFullDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** The last calendar day of a month, e.g. `2026-09` → `2026-09-30`. */
export function lastDayOfMonth(month: string): string {
  const day = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5)),
    0,
  ).getDate();
  return `${month}-${day}`;
}

/** The inclusive date window a report covers, given the active period. */
export function reportRange(
  period: Period,
  month: string,
  from: string,
  to: string,
): { start: string; end: string; days: number } {
  const start = period === 'custom' ? from : `${month}-01`;
  const end = period === 'custom' ? to : lastDayOfMonth(month);
  const days = Math.max(
    1,
    Math.round(
      (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
        86400000,
    ) + 1,
  );
  return { start, end, days };
}

/** Human label for the active period, used in panel headings. */
export function periodLabel(
  period: Period,
  month: string,
  from: string,
  to: string,
): string {
  if (period === 'year') return month.slice(0, 4);
  if (period === 'custom') return `${from} to ${to}`;
  return monthLabel(month);
}
