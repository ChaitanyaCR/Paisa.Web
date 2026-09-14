import { describe, expect, it } from 'vitest';
import {
  currentMonth,
  formatDayMonth,
  formatFullDate,
  addDays,
  lastDayOfMonth,
  monthLabel,
  moveMonth,
  periodLabel,
  reportRange,
  toDateKey,
} from '../lib/dates';

describe('monthLabel', () => {
  it('renders a readable month and year', () => {
    expect(monthLabel('2026-09')).toBe('September 2026');
    expect(monthLabel('2026-01')).toBe('January 2026');
  });
});

describe('moveMonth', () => {
  it('steps forward and back', () => {
    expect(moveMonth('2026-09', 1)).toBe('2026-10');
    expect(moveMonth('2026-09', -1)).toBe('2026-08');
  });

  it('crosses year boundaries', () => {
    expect(moveMonth('2026-12', 1)).toBe('2027-01');
    expect(moveMonth('2026-01', -1)).toBe('2025-12');
  });
});

describe('toDateKey', () => {
  it('zero-pads month and day', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('lastDayOfMonth', () => {
  it('handles 30- and 31-day months', () => {
    expect(lastDayOfMonth('2026-09')).toBe('2026-09-30');
    expect(lastDayOfMonth('2026-10')).toBe('2026-10-31');
  });

  it('handles February in common and leap years', () => {
    expect(lastDayOfMonth('2026-02')).toBe('2026-02-28');
    expect(lastDayOfMonth('2028-02')).toBe('2028-02-29');
  });
});

describe('addDays', () => {
  it('moves calendar keys across month and year boundaries without local time', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('reportRange', () => {
  it('spans the whole month for a monthly report', () => {
    expect(reportRange('month', '2026-09', '', '')).toStrictEqual({
      start: '2026-09-01',
      end: '2026-09-30',
      days: 30,
    });
  });

  it('uses the custom window when one is set', () => {
    expect(
      reportRange('custom', '2026-09', '2026-09-10', '2026-09-12'),
    ).toStrictEqual({
      start: '2026-09-10',
      end: '2026-09-12',
      days: 3,
    });
  });

  it('never reports fewer than one day, even for an inverted range', () => {
    expect(
      reportRange('custom', '2026-09', '2026-09-20', '2026-09-01').days,
    ).toBe(1);
  });
});

describe('formatting', () => {
  it('formats a day and month', () => {
    expect(formatDayMonth('2026-09-07')).toBe('7 Sept');
  });

  it('formats a full date', () => {
    expect(formatFullDate('2026-09-07')).toBe('07 Sept 2026');
  });
});

describe('periodLabel', () => {
  it('labels each period shape', () => {
    expect(periodLabel('month', '2026-09', '', '')).toBe('September 2026');
    expect(periodLabel('year', '2026-09', '', '')).toBe('2026');
    expect(periodLabel('custom', '2026-09', '2026-09-01', '2026-09-15')).toBe(
      '2026-09-01 to 2026-09-15',
    );
  });
});

describe('currentMonth', () => {
  it('tracks the real calendar month rather than a fixed one', () => {
    const now = new Date();
    expect(currentMonth()).toBe(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    );
    expect(currentMonth()).toBe(toDateKey(now).slice(0, 7));
  });
});
