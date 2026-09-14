'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { CategoryIcon } from '@/components/category-icon';
import type { ReportEntry } from '@/lib/aggregate';
import { money, percentage, ratio } from '@/lib/money';
import { categoryHref } from '@/lib/use-filters';

export function CategoryReport({
  report,
  income,
  expense,
  month,
  hasEntries,
}: {
  report: ReportEntry[];
  income: number;
  expense: number;
  month: string;
  hasEntries: boolean;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>Category report</h3>
          <p>
            Compare amounts and each category’s share of its transaction type. Select a row to
            explore entries.
          </p>
        </div>
      </div>
      <div className="category-report">
        {report.map((c) => {
          const total = c.type === 'income' ? income : expense;
          return (
            <Link key={c.id} href={categoryHref(c.id, month)}>
              <CategoryIcon category={c} />
              <span>
                <strong>{c.name}</strong>
                <small>
                  {c.type === 'income' ? 'Income' : 'Expense'} · {c.count} entries
                </small>
              </span>
              <div className="report-meter">
                <i style={{ width: `${ratio(c.total, total)}%`, background: c.color }} />
              </div>
              <strong>{money(c.total)}</strong>
              <small>{percentage(c.total, total)}%</small>
              <ChevronRight size={15} />
            </Link>
          );
        })}
      </div>
      {!hasEntries && <p className="empty">No entries match these filters.</p>}
    </section>
  );
}
