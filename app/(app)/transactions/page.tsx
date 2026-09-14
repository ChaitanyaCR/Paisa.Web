'use client';

import { useAppState } from '@/components/app-state';
import { FilterBar } from '@/features/transactions/filter-bar';
import { TransactionList } from '@/features/transactions/transaction-list';
import { periodLabel } from '@/lib/dates';
import { money } from '@/lib/money';
import { useFilters } from '@/lib/use-filters';

export default function TransactionsPage() {
  const { transactions, transactionTotal, transactionTotals } = useAppState();
  const filters = useFilters();

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>
            All transactions{' '}
            <span className="count-badge">{transactionTotal}</span>
          </h3>
          <p>
            Manual entries ·{' '}
            {periodLabel(
              filters.period,
              filters.month,
              filters.from,
              filters.to,
            )}
          </p>
        </div>
      </div>
      <FilterBar />
      <TransactionList transactions={transactions} />
      <div className="table-footer">
        {transactionTotal} entries{' '}
        <span>
          Income {money(transactionTotals.income)} · Expenses{' '}
          {money(transactionTotals.expense)}
        </span>
      </div>
      {transactionTotal > 25 && (
        <div className="account-buttons">
          <button
            className="secondary-action"
            disabled={filters.page === 1}
            onClick={() => filters.setFilters({ page: filters.page - 1 })}
          >
            Previous
          </button>
          <span>
            Page {filters.page} of {Math.ceil(transactionTotal / 25)}
          </span>
          <button
            className="secondary-action"
            disabled={filters.page * 25 >= transactionTotal}
            onClick={() => filters.setFilters({ page: filters.page + 1 })}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
