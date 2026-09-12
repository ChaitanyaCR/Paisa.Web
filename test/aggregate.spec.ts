import { describe, expect, it } from 'vitest';
import {
  buildBreakdown,
  buildCategoryReport,
  buildChartData,
  categorySpend,
  chartCeiling,
  countByType,
  filterTransactions,
  inMonth,
  sumByType,
} from '../lib/aggregate';
import type { Category, Transaction } from '../lib/types';

const categories: Category[] = [
  { id: 'salary', name: 'Salary', type: 'income', color: '#000' },
  { id: 'food', name: 'Food & groceries', type: 'expense', color: '#111' },
  { id: 'home', name: 'Rent & bills', type: 'expense', color: '#222' },
  { id: 'old', name: 'Retired', type: 'expense', color: '#333', archived: true },
];

const tx = (
  id: string,
  category: string,
  amount: number,
  date: string,
  notes = '',
): Transaction => ({
  id,
  category,
  amount,
  date,
  notes,
  type: category === 'salary' ? 'income' : 'expense',
});

const transactions: Transaction[] = [
  tx('1', 'salary', 8500000, '2026-09-01', 'Monthly salary'),
  tx('2', 'home', 1800000, '2026-09-02', 'September rent'),
  tx('3', 'food', 245000, '2026-09-03', 'Weekly groceries'),
  tx('4', 'food', 85000, '2026-09-07', 'Dinner with friends'),
  tx('5', 'home', 1700000, '2026-08-02', 'August rent'),
  tx('6', 'food', 120000, '2025-09-04', 'Last year'),
];

const base = {
  period: 'month' as const,
  month: '2026-09',
  from: '2026-09-01',
  to: '2026-09-30',
  typeFilter: 'all',
  catFilter: 'all',
  query: '',
};

describe('inMonth', () => {
  it('keeps only the selected month', () => {
    expect(inMonth(transactions, '2026-09').map((t) => t.id)).toStrictEqual(['1', '2', '3', '4']);
  });
});

describe('filterTransactions', () => {
  it('returns the month newest first', () => {
    expect(filterTransactions(transactions, categories, base).map((t) => t.id)).toStrictEqual(
      ['4', '3', '2', '1'],
    );
  });

  it('filters by type', () => {
    expect(
      filterTransactions(transactions, categories, { ...base, typeFilter: 'income' }).map(
        (t) => t.id,
      ),
    ).toStrictEqual(['1']);
  });

  it('filters by category', () => {
    expect(
      filterTransactions(transactions, categories, { ...base, catFilter: 'food' }).map(
        (t) => t.id,
      ),
    ).toStrictEqual(['4', '3']);
  });

  it('searches notes and category name, case insensitively', () => {
    expect(
      filterTransactions(transactions, categories, { ...base, query: 'RENT' }).map((t) => t.id),
    ).toStrictEqual(['2']);
    expect(
      filterTransactions(transactions, categories, { ...base, query: 'groceries' }).map(
        (t) => t.id,
      ),
    ).toStrictEqual(['4', '3']);
  });

  it('widens to the whole year when the period is yearly', () => {
    expect(
      filterTransactions(transactions, categories, { ...base, period: 'year' }).map((t) => t.id),
    ).toStrictEqual(['4', '3', '2', '1', '5']);
  });

  it('honours an inclusive custom range', () => {
    expect(
      filterTransactions(transactions, categories, {
        ...base,
        period: 'custom',
        from: '2026-09-02',
        to: '2026-09-03',
      }).map((t) => t.id),
    ).toStrictEqual(['3', '2']);
  });

  it('combines filters', () => {
    expect(
      filterTransactions(transactions, categories, {
        ...base,
        typeFilter: 'expense',
        catFilter: 'food',
        query: 'dinner',
      }).map((t) => t.id),
    ).toStrictEqual(['4']);
  });
});

describe('totals', () => {
  const month = inMonth(transactions, '2026-09');

  it('sums and counts by type', () => {
    expect(sumByType(month, 'income')).toBe(8500000);
    expect(sumByType(month, 'expense')).toBe(2130000);
    expect(countByType(month, 'expense')).toBe(3);
  });

  it('sums one category', () => {
    expect(categorySpend(month, 'food')).toBe(330000);
    expect(categorySpend(month, 'nonexistent')).toBe(0);
  });
});

describe('buildBreakdown', () => {
  const month = inMonth(transactions, '2026-09');

  it('ranks expense categories by total and omits empty ones', () => {
    expect(buildBreakdown(categories, month).map((c) => [c.id, c.total])).toStrictEqual([
      ['home', 1800000],
      ['food', 330000],
    ]);
  });

  it('excludes income categories entirely', () => {
    expect(buildBreakdown(categories, month).some((c) => c.id === 'salary')).toBe(false);
  });
});

describe('buildCategoryReport', () => {
  it('includes income and expense, with entry counts', () => {
    const month = inMonth(transactions, '2026-09');
    expect(buildCategoryReport(categories, month).map((c) => [c.id, c.total, c.count])).toStrictEqual(
      [
        ['salary', 8500000, 1],
        ['home', 1800000, 1],
        ['food', 330000, 2],
      ],
    );
  });
});

describe('buildChartData', () => {
  it('produces twelve bars for a yearly period', () => {
    const bars = buildChartData(transactions, 'year', '2026-09', '', '');
    expect(bars).toHaveLength(12);
    expect(bars[8]).toStrictEqual({ label: 'Sept', income: 8500000, expense: 2250000 });
  });

  it('buckets the yearly view by month number alone, ignoring the year', () => {
    // September 2025 lands in the same bar as September 2026. Harmless as called
    // — the caller passes transactions already filtered to one year — but the
    // function is not safe to reuse without that. Flagged for Phase 6.
    const bars = buildChartData(transactions, 'year', '2026-09', '', '');
    const septemberExpense = bars[8].expense;
    const only2026 = buildChartData(
      transactions.filter((t) => t.date.startsWith('2026')),
      'year',
      '2026-09',
      '',
      '',
    );

    expect(septemberExpense).toBe(2250000);
    expect(only2026[8].expense).toBe(2130000);
  });

  it('produces four bars across a month', () => {
    const bars = buildChartData(inMonth(transactions, '2026-09'), 'month', '2026-09', '', '');
    expect(bars).toHaveLength(4);
    expect(bars.reduce((sum, b) => sum + b.income + b.expense, 0)).toBeGreaterThan(0);
  });

  it('produces one bar per day when the range is shorter than four days', () => {
    expect(
      buildChartData(transactions, 'custom', '2026-09', '2026-09-01', '2026-09-02'),
    ).toHaveLength(2);
  });
});

describe('chartCeiling', () => {
  it('floors at ₹100 so an empty chart still has a scale', () => {
    expect(chartCeiling([])).toBe(10000);
    expect(chartCeiling([{ label: 'a', income: 0, expense: 0 }])).toBe(10000);
  });

  it('otherwise uses the largest bar', () => {
    expect(chartCeiling([{ label: 'a', income: 5000000, expense: 120000 }])).toBe(5000000);
  });
});
