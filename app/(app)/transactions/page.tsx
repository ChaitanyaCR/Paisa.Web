'use client';

import { useAppState } from '@/components/app-state';
import { FilterBar } from '@/features/transactions/filter-bar';
import { TransactionList } from '@/features/transactions/transaction-list';
import { filterTransactions, sumByType } from '@/lib/aggregate';
import { periodLabel } from '@/lib/dates';
import { money } from '@/lib/money';
import { useFilters } from '@/lib/use-filters';

export default function TransactionsPage() {
  const { transactions, categories } = useAppState();
  const filters = useFilters();
  const filtered = filterTransactions(transactions, categories, filters);
  const income = sumByType(filtered, 'income');
  const expense = sumByType(filtered, 'expense');

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>
            All transactions <span className="count-badge">{filtered.length}</span>
          </h3>
          <p>
            Manual entries ·{' '}
            {periodLabel(filters.period, filters.month, filters.from, filters.to)}
          </p>
        </div>
      </div>
      <FilterBar />
      <TransactionList transactions={filtered} />
      <div className="table-footer">
        {filtered.length} entries{' '}
        <span>
          Income {money(income)} · Expenses {money(expense)}
        </span>
      </div>
    </section>
  );
}
