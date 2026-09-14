import { addDays, reportRange } from './dates';
import type { Category, Kind, Period, Transaction } from './types';

export type Filters = {
  period: Period;
  month: string;
  from: string;
  to: string;
  typeFilter: string;
  catFilter: string;
  query: string;
};

/** Transactions inside the selected month, ignoring the other filters. */
export function inMonth(
  transactions: Transaction[],
  month: string,
): Transaction[] {
  return transactions.filter((t) => t.date.startsWith(month));
}

/** The filter bar applied, newest first. */
export function filterTransactions(
  transactions: Transaction[],
  categories: Category[],
  filters: Filters,
): Transaction[] {
  const { period, month, from, to, typeFilter, catFilter, query } = filters;

  return transactions
    .filter((t) => {
      const inPeriod =
        period === 'year'
          ? t.date.startsWith(month.slice(0, 4))
          : period === 'custom'
            ? t.date >= from && t.date <= to
            : t.date.startsWith(month);
      const category = categories.find((c) => c.id === t.category);
      return (
        inPeriod &&
        (typeFilter === 'all' || t.type === typeFilter) &&
        (catFilter === 'all' || t.category === catFilter) &&
        `${t.notes} ${category?.name}`
          .toLowerCase()
          .includes(query.toLowerCase())
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function sumByType(list: Transaction[], type: Kind): number {
  return list
    .filter((t) => t.type === type)
    .reduce((sum, t) => sum + t.amount, 0);
}

export function countByType(list: Transaction[], type: Kind): number {
  return list.filter((t) => t.type === type).length;
}

export function categorySpend(list: Transaction[], categoryId: string): number {
  return list
    .filter((t) => t.category === categoryId)
    .reduce((sum, t) => sum + t.amount, 0);
}

export type BreakdownEntry = Category & { total: number };

/** Expense categories with a non-zero total, largest first. */
export function buildBreakdown(
  categories: Category[],
  list: Transaction[],
): BreakdownEntry[] {
  return categories
    .filter((c) => c.type === 'expense')
    .map((c) => ({ ...c, total: categorySpend(list, c.id) }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
}

export type ReportEntry = Category & { total: number; count: number };

/** Every category that has entries in the period, largest total first. */
export function buildCategoryReport(
  categories: Category[],
  list: Transaction[],
): ReportEntry[] {
  return categories
    .map((c) => ({
      ...c,
      total: categorySpend(list, c.id),
      count: list.filter((t) => t.category === c.id).length,
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.total - a.total);
}

export type ChartBar = { label: string; income: number; expense: number };

/**
 * Buckets the period into bars: twelve months for a yearly view, otherwise up to
 * four even slices of the range.
 *
 * Calendar keys are advanced without reading the viewer's timezone, so a
 * transaction always stays in the date bucket the user entered.
 */
export function buildChartData(
  list: Transaction[],
  period: Period,
  month: string,
  from: string,
  to: string,
): ChartBar[] {
  const groups =
    period === 'year'
      ? Array.from({ length: 12 }, (_, i) => ({
          label: new Intl.DateTimeFormat('en-IN', {
            month: 'short',
            timeZone: 'UTC',
          }).format(new Date(Date.UTC(Number(month.slice(0, 4)), i, 1))),
          entries: list.filter((t) => Number(t.date.slice(5, 7)) === i + 1),
        }))
      : (() => {
          const { start, days } = reportRange(period, month, from, to);
          const buckets = Math.min(4, days);
          return Array.from({ length: buckets }, (_, i) => {
            const sliceStart = addDays(start, Math.floor((i * days) / buckets));
            const sliceEnd = addDays(
              start,
              Math.floor(((i + 1) * days) / buckets),
            );
            return {
              label: new Date(`${sliceStart}T12:00:00`).toLocaleDateString(
                'en-IN',
                {
                  day: 'numeric',
                  month: 'short',
                },
              ),
              entries: list.filter(
                (t) => t.date >= sliceStart && t.date < sliceEnd,
              ),
            };
          });
        })();

  return groups.map((group) => ({
    label: group.label,
    income: sumByType(group.entries, 'income'),
    expense: sumByType(group.entries, 'expense'),
  }));
}

/** Axis ceiling for the bar chart, floored at ₹100 so an empty chart still scales. */
export function chartCeiling(data: ChartBar[]): number {
  return Math.max(...data.map((d) => Math.max(d.income, d.expense)), 10000);
}

/** The budget key for a category in a month. */
export function budgetKey(month: string, categoryId: string): string {
  return `${month}:${categoryId}`;
}
