'use client';

import { useEffect, useState } from 'react';
import { CategoryReport } from '@/features/analytics/category-report';
import { IncomeExpenseChart } from '@/features/analytics/bar-chart';
import { SpendingBreakdown } from '@/features/analytics/spending-breakdown';
import { FilterBar } from '@/features/transactions/filter-bar';
import type { AnalyticsResult } from '@/lib/db/analytics';
import { lastDayOfMonth, periodLabel } from '@/lib/dates';
import { money } from '@/lib/money';
import { useFilters } from '@/lib/use-filters';

export default function AnalyticsPage() {
  const filters = useFilters();
  const { period, month, from, to } = filters;
  const [data, setData] = useState<AnalyticsResult | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({ period, month });
    if (filters.query) params.set('query', filters.query);
    if (filters.typeFilter !== 'all') params.set('type', filters.typeFilter);
    if (filters.catFilter !== 'all') params.set('category', filters.catFilter);
    if (period === 'year') {
      params.set('from', `${month.slice(0, 4)}-01-01`);
      params.set('to', `${month.slice(0, 4)}-12-31`);
    } else if (period === 'custom') {
      params.set('from', from);
      params.set('to', to);
    } else {
      params.set('from', `${month}-01`);
      params.set('to', lastDayOfMonth(month));
    }
    const controller = new AbortController();
    fetch(`/api/analytics?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            (await response.json().catch(() => null))?.error?.message ??
              'Unable to load analytics.',
          );
        setData(await response.json());
        setError('');
      })
      .catch((cause) => {
        if (cause.name !== 'AbortError') setError(cause.message);
      });
    return () => controller.abort();
  }, [
    filters.catFilter,
    filters.query,
    filters.typeFilter,
    from,
    month,
    period,
    revision,
    to,
  ]);

  return (
    <>
      <FilterBar />
      {error && (
        <div className="panel form-validation" role="alert">
          <span>!</span>
          {error}
          <button
            className="text-link"
            onClick={() => setRevision((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      )}
      {!data ? (
        <div className="panel preview-note" role="status">
          Loading analytics…
        </div>
      ) : (
        <>
          <div className="report-summary">
            <span>
              <small>INCOME</small>
              <strong className="income-text">{money(data.income)}</strong>
            </span>
            <span>
              <small>EXPENSES</small>
              <strong className="expense-text">{money(data.expense)}</strong>
            </span>
            <span>
              <small>NET SAVINGS</small>
              <strong>{money(data.income - data.expense)}</strong>
            </span>
            <span>
              <small>ENTRIES IN REPORT</small>
              <strong>{data.count}</strong>
            </span>
          </div>
          <div className="charts-grid">
            <IncomeExpenseChart
              data={data.chart}
              periodLabel={
                period === 'custom'
                  ? 'Custom date range'
                  : periodLabel(period, month, from, to)
              }
            />
            <SpendingBreakdown
              breakdown={data.breakdown}
              expense={data.expense}
              month={month}
            />
          </div>
          <CategoryReport
            report={data.report}
            income={data.income}
            expense={data.expense}
            month={month}
            hasEntries={data.count > 0}
          />
        </>
      )}
    </>
  );
}
