'use client';

import { Pencil, Search } from 'lucide-react';
import { CategoryIcon, CategoryPill } from '@/components/category-icon';
import { useAppState } from '@/components/app-state';
import { useDialogs } from '@/components/dialogs/dialog-provider';
import { formatDayMonth } from '@/lib/dates';
import { money } from '@/lib/money';
import type { Transaction } from '@/lib/types';

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
  const { getCategory } = useAppState();
  const { openTransaction } = useDialogs();

  return (
    <div className="transaction-list">
      <div className="table-head">
        <span>TRANSACTION</span>
        <span>CATEGORY</span>
        <span>DATE</span>
        <span>AMOUNT</span>
        <span />
      </div>
      {transactions.length ? (
        transactions.map((t) => {
          const category = getCategory(t.category);
          return (
            <div className="transaction-row" key={t.id}>
              <div className="transaction-name">
                <CategoryIcon category={category} />
                <div>
                  <strong>{t.notes || category?.name}</strong>
                  <small>
                    {t.type === 'income' ? 'Income' : 'Expense'} · Manual entry
                  </small>
                  <CategoryPill category={category} className="mobile-category-badge" />
                </div>
              </div>
              <CategoryPill category={category} />
              <span className="transaction-date">{formatDayMonth(t.date)}</span>
              <strong className={`amount ${t.type}`}>
                {t.type === 'income' ? '+' : '−'}
                {money(t.amount)}
              </strong>
              <button
                className="icon-button"
                aria-label={`Edit ${t.notes}`}
                onClick={() => openTransaction(t)}
              >
                <Pencil size={15} />
              </button>
            </div>
          );
        })
      ) : (
        <div className="empty">
          <Search />
          <h3>No transactions found</h3>
          <p>Try another period or add your first entry.</p>
        </div>
      )}
    </div>
  );
}
