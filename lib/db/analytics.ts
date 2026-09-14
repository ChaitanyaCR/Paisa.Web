import type { Database } from 'better-sqlite3';
import {
  buildChartData,
  type BreakdownEntry,
  type ChartBar,
  type ReportEntry,
} from '@/lib/aggregate';
import type { Kind, Period, Transaction } from '@/lib/types';
import type { TransactionFilters } from '@/lib/validation';
import { transactionWhere } from '@/lib/db/transactions';

export type AnalyticsResult = {
  income: number;
  expense: number;
  count: number;
  breakdown: BreakdownEntry[];
  report: ReportEntry[];
  chart: ChartBar[];
};

export function getAnalytics(
  db: Database,
  userId: string,
  filters: TransactionFilters,
  period: Period,
  month: string,
  from: string,
  to: string,
): AnalyticsResult {
  const condition = transactionWhere(userId, filters);
  const join = `FROM transactions t JOIN categories c ON c.id = t.category_id WHERE ${condition.sql}`;
  const totals = db
    .prepare(
      `SELECT count(*) count, coalesce(sum(CASE WHEN t.type = 'income' THEN t.amount_paise ELSE 0 END), 0) income, coalesce(sum(CASE WHEN t.type = 'expense' THEN t.amount_paise ELSE 0 END), 0) expense ${join}`,
    )
    .get(...condition.values) as {
    count: number;
    income: number;
    expense: number;
  };
  const report = db
    .prepare(
      `SELECT c.id, c.name, c.type, c.color, count(*) count, sum(t.amount_paise) total ${join} GROUP BY c.id, c.name, c.type, c.color ORDER BY total DESC`,
    )
    .all(...condition.values) as ReportEntry[];
  const daily = db
    .prepare(
      `SELECT t.date, t.type, sum(t.amount_paise) amount ${join} GROUP BY t.date, t.type ORDER BY t.date`,
    )
    .all(...condition.values) as Array<{
    date: string;
    type: Kind;
    amount: number;
  }>;
  const aggregateTransactions: Transaction[] = daily.map((row, index) => ({
    id: String(index),
    category: '',
    notes: '',
    ...row,
  }));
  return {
    ...totals,
    report,
    breakdown: report.filter(
      (entry) => entry.type === 'expense',
    ) as BreakdownEntry[],
    chart: buildChartData(aggregateTransactions, period, month, from, to),
  };
}
