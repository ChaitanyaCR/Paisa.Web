'use client';

import { useAppState } from '@/components/app-state';
import { CategoryReport } from '@/features/analytics/category-report';
import { IncomeExpenseChart } from '@/features/analytics/bar-chart';
import { SpendingBreakdown } from '@/features/analytics/spending-breakdown';
import { FilterBar } from '@/features/transactions/filter-bar';
import {
  buildBreakdown,
  buildCategoryReport,
  buildChartData,
  filterTransactions,
  sumByType,
} from '@/lib/aggregate';
import { periodLabel } from '@/lib/dates';
import { money } from '@/lib/money';
import { useFilters } from '@/lib/use-filters';

export default function AnalyticsPage() {
  const { transactions, categories } = useAppState();
  const filters = useFilters();
  const { period, month, from, to } = filters;

  const filtered = filterTransactions(transactions, categories, filters);
  const income = sumByType(filtered, 'income');
  const expense = sumByType(filtered, 'expense');

  return (
    <>
      <FilterBar />
      <div className="report-summary">
        <span>
          <small>INCOME</small>
          <strong className="income-text">{money(income)}</strong>
        </span>
        <span>
          <small>EXPENSES</small>
          <strong className="expense-text">{money(expense)}</strong>
        </span>
        <span>
          <small>NET SAVINGS</small>
          <strong>{money(income - expense)}</strong>
        </span>
        <span>
          <small>ENTRIES IN REPORT</small>
          <strong>{filtered.length}</strong>
        </span>
      </div>
      <div className="charts-grid">
        <IncomeExpenseChart
          data={buildChartData(filtered, period, month, from, to)}
          periodLabel={
            period === 'custom' ? 'Custom date range' : periodLabel(period, month, from, to)
          }
        />
        <SpendingBreakdown
          breakdown={buildBreakdown(categories, filtered)}
          expense={expense}
          month={month}
        />
      </div>
      <CategoryReport
        report={buildCategoryReport(categories, filtered)}
        income={income}
        expense={expense}
        month={month}
        hasEntries={filtered.length > 0}
      />
    </>
  );
}
