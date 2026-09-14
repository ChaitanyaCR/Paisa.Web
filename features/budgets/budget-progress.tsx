'use client';

import { money, percentage, ratio } from '@/lib/money';

/** The shared progress bar used by both the overview mini-cards and the budget cards. */
export function BudgetProgress({
  label,
  spent,
  limit,
}: {
  label: string;
  spent: number;
  limit: number;
}) {
  const used = percentage(spent, limit);
  const over = limit > 0 && spent > limit;

  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={`${label} budget used`}
      aria-valuenow={Math.min(used, 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span
        style={{
          width: `${ratio(spent, limit)}%`,
          background: over ? 'var(--expense)' : 'var(--primary)',
        }}
      />
    </div>
  );
}

/** "₹400 remaining" / "₹120 over" — the copy under a budget bar. */
export function budgetRemainder(spent: number, limit: number): string {
  if (!limit) return 'No budget set';
  return spent > limit ? `${money(spent - limit)} over` : `${money(limit - spent)} remaining`;
}
