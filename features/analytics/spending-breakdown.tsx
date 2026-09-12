'use client';

import Link from 'next/link';
import type { BreakdownEntry } from '@/lib/aggregate';
import { money, percentage, ratio } from '@/lib/money';
import { categoryHref } from '@/lib/use-filters';

export function SpendingBreakdown({
  breakdown,
  expense,
  month,
}: {
  breakdown: BreakdownEntry[];
  expense: number;
  month: string;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>Where your money goes</h3>
          <p>Expenses by category</p>
        </div>
      </div>
      <div className="spending-total">
        <strong>{money(expense)}</strong>
        <span>Total spent</span>
      </div>
      <div className="segmented-bar">
        {breakdown.map((c) => (
          <Link
            key={c.id}
            href={categoryHref(c.id, month)}
            style={{ width: `${ratio(c.total, expense)}%`, background: c.color }}
            aria-label={`${c.name}: ${money(c.total)}`}
          />
        ))}
      </div>
      <div className="category-breakdown">
        {breakdown.length ? (
          breakdown.map((c) => (
            <Link key={c.id} href={categoryHref(c.id, month)}>
              <span>
                <i style={{ background: c.color }} />
                {c.name}
              </span>
              <strong>{money(c.total)}</strong>
              <small>{percentage(c.total, expense)}%</small>
            </Link>
          ))
        ) : (
          <p className="empty">No expenses in this period.</p>
        )}
      </div>
    </section>
  );
}
