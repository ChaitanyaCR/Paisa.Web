'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useAppState } from '@/components/app-state';
import { StatCards } from '@/features/overview/stat-cards';
import {
  BudgetProgress,
  budgetRemainder,
} from '@/features/budgets/budget-progress';
import { TransactionList } from '@/features/transactions/transaction-list';
import { budgetKey, buildBreakdown, inMonth, sumByType } from '@/lib/aggregate';
import { monthLabel } from '@/lib/dates';
import { money, percentage } from '@/lib/money';
import { hrefWithMonth, useFilters } from '@/lib/use-filters';

export default function OverviewPage() {
  const {
    transactions,
    categories,
    budgets,
    budgetSpending,
    budgeting,
    transactionTotals,
  } = useAppState();
  const { month } = useFilters();

  const monthly = inMonth(transactions, month);
  const expense = sumByType(monthly, 'expense');
  const breakdown = buildBreakdown(categories, monthly);
  const budgeted = categories.filter(
    (c) =>
      c.type === 'expense' &&
      !c.archived &&
      budgets[budgetKey(month, c.id)] > 0,
  );

  return (
    <>
      <StatCards transactions={monthly} totals={transactionTotals} />

      {budgeting && (
        <section className="panel overview-budget">
          <div className="panel-heading">
            <div>
              <h3>Monthly budget progress</h3>
              <p>Your category limits, right alongside your monthly totals.</p>
            </div>
            <Link className="text-link" href={hrefWithMonth('/budgets', month)}>
              Manage budgets <ArrowRight size={15} />
            </Link>
          </div>
          <div className="budget-mini-grid">
            {budgeted.map((c) => {
              const limit = budgets[budgetKey(month, c.id)];
              const spent = budgetSpending[budgetKey(month, c.id)] ?? 0;
              return (
                <Link
                  className="budget-mini"
                  key={c.id}
                  href={hrefWithMonth('/budgets', month)}
                >
                  <span>
                    <strong>{c.name}</strong>
                    <small>{percentage(spent, limit)}%</small>
                  </span>
                  <BudgetProgress label={c.name} spent={spent} limit={limit} />
                  <small>{budgetRemainder(spent, limit)}</small>
                </Link>
              );
            })}
          </div>
          {!budgeted.length && (
            <p className="budget-empty">
              No limits set for this month. Set your first category budget to
              see progress here.
            </p>
          )}
        </section>
      )}

      <div className="overview-insight">
        <div>
          <span className="eyebrow">THIS MONTH’S SNAPSHOT</span>
          <h3>
            {breakdown.length
              ? `${breakdown[0].name} is your largest expense category.`
              : 'Your month starts with a single entry.'}
          </h3>
          <p>
            {breakdown.length
              ? `${money(breakdown[0].total)} · ${percentage(breakdown[0].total, expense)}% of your spending this month.`
              : 'Add income or an expense to start building your picture.'}
          </p>
        </div>
        <Link className="text-link" href={hrefWithMonth('/analytics', month)}>
          Explore analytics <ArrowRight size={16} />
        </Link>
      </div>

      <section className="panel recent">
        <div className="panel-heading">
          <div>
            <h3>Recent transactions</h3>
            <p>Your latest entries for {monthLabel(month)}.</p>
          </div>
          <Link
            className="text-link"
            href={hrefWithMonth('/transactions', month)}
          >
            View all <ArrowRight size={15} />
          </Link>
        </div>
        <TransactionList
          transactions={[...monthly]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 5)}
        />
      </section>
    </>
  );
}
