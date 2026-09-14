'use client';

import { ArrowDownLeft, ArrowUpRight, Leaf, Wallet } from 'lucide-react';
import { countByType } from '@/lib/aggregate';
import { money, percentage } from '@/lib/money';
import type { Transaction } from '@/lib/types';

export function StatCards({
  transactions,
  totals,
}: {
  transactions: Transaction[];
  totals?: { income: number; expense: number; expenseCount: number };
}) {
  const income =
    totals?.income ??
    transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  const expense =
    totals?.expense ??
    transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="stats-grid">
      <article className="stat-card">
        <div className="stat-top">
          Total income
          <span className="stat-icon green">
            <ArrowDownLeft size={20} />
          </span>
        </div>
        <h2>{money(income)}</h2>
        <span className="stat-caption">
          <span className="dot green-dot" />
          Money coming in
        </span>
      </article>
      <article className="stat-card">
        <div className="stat-top">
          Total expenses
          <span className="stat-icon peach">
            <ArrowUpRight size={20} />
          </span>
        </div>
        <h2>{money(expense)}</h2>
        <span className="stat-caption">
          <span className="dot peach-dot" />
          {totals?.expenseCount ?? countByType(transactions, 'expense')} expense
          entries
        </span>
      </article>
      <article className="stat-card savings">
        <div className="stat-top">
          Net savings
          <span className="stat-icon">
            <Wallet size={20} />
          </span>
        </div>
        <h2>{money(income - expense)}</h2>
        <span className="stat-caption">
          {income > 0
            ? `${percentage(income - expense, income)}% of your income saved`
            : 'Income minus expenses'}{' '}
          <Leaf size={14} />
        </span>
      </article>
    </div>
  );
}
