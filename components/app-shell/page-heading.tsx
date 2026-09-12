'use client';

import { Button as FluentButton } from '@fluentui/react-components';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useDialogs } from '@/components/dialogs/dialog-provider';
import { moveMonth } from '@/lib/dates';
import { entryPages, monthScopedPages, navNameForPath, pageCopy } from '@/lib/navigation';
import { useFilters } from '@/lib/use-filters';

export function PageHeading() {
  const pathname = usePathname();
  const { month, setFilters } = useFilters();
  const { openTransaction } = useDialogs();

  const current = navNameForPath(pathname);
  const copy = pageCopy[current];

  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{copy.eyebrow}</span>
        <h1>{copy.title}</h1>
        <p>{copy.lead}</p>
      </div>
      <div className="heading-actions">
        {monthScopedPages.includes(current) && (
          <div className="month-picker" role="group" aria-label="Month navigation">
            <button
              title="Previous month"
              aria-label="Previous month"
              onClick={() => setFilters({ month: moveMonth(month, -1) })}
            >
              <ChevronLeft size={16} />
            </button>
            <input
              aria-label="Selected month"
              type="month"
              value={month}
              onChange={(e) => e.target.value && setFilters({ month: e.target.value })}
            />
            <button
              title="Next month"
              aria-label="Next month"
              onClick={() => setFilters({ month: moveMonth(month, 1) })}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
        {entryPages.includes(current) && (
          <FluentButton
            appearance="primary"
            icon={<Plus size={17} />}
            onClick={() => openTransaction()}
          >
            Add transaction
          </FluentButton>
        )}
      </div>
    </div>
  );
}
