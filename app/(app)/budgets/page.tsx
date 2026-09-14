'use client';

import { Button as FluentButton } from '@fluentui/react-components';
import { Pencil, Wallet } from 'lucide-react';
import { CategoryIcon } from '@/components/category-icon';
import { useAppState } from '@/components/app-state';
import { useDialogs } from '@/components/dialogs/dialog-provider';
import { BudgetProgress } from '@/features/budgets/budget-progress';
import { budgetKey } from '@/lib/aggregate';
import { money, percentage } from '@/lib/money';
import { useFilters } from '@/lib/use-filters';

export default function BudgetsPage() {
  const { categories, budgets, budgetSpending, copyPreviousBudgets } =
    useAppState();
  const { openBudget } = useDialogs();
  const { month } = useFilters();

  const expenseCategories = categories.filter(
    (c) => c.type === 'expense' && !c.archived,
  );

  return (
    <>
      <div className="budget-callout">
        <span className="stat-icon brand-icon">
          <Wallet size={24} />
        </span>
        <div>
          <h3>Your monthly spending plan</h3>
          <p>Limits guide your spending. They won’t block new expenses.</p>
        </div>
        <FluentButton
          className="primary-action"
          appearance="primary"
          onClick={() => openBudget()}
        >
          + Set a budget
        </FluentButton>
        <FluentButton
          appearance="secondary"
          onClick={() => void copyPreviousBudgets(month)}
        >
          Copy previous month
        </FluentButton>
      </div>
      <div className="budget-grid">
        {expenseCategories.map((c) => {
          const limit = budgets[budgetKey(month, c.id)] || 0;
          const spent = budgetSpending[budgetKey(month, c.id)] ?? 0;
          return (
            <article className="panel budget-card" key={c.id}>
              <div className="panel-heading">
                <div className="budget-title">
                  <CategoryIcon category={c} />
                  <h3>{c.name}</h3>
                </div>
                <button
                  className="icon-button"
                  aria-label={`Edit budget for ${c.name}`}
                  onClick={() => openBudget(c.id)}
                >
                  <Pencil size={16} />
                </button>
              </div>
              <h2>
                {money(spent)}{' '}
                <small>{limit ? `of ${money(limit)}` : 'spent'}</small>
              </h2>
              <BudgetProgress label={c.name} spent={spent} limit={limit} />
              <div className="budget-status">
                <span>
                  {limit
                    ? spent > limit
                      ? `${money(spent - limit)} over budget`
                      : `${money(limit - spent)} left`
                    : 'No budget set'}
                </span>
                <strong>{limit ? `${percentage(spent, limit)}%` : '—'}</strong>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
