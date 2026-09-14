'use client';

import { Button as FluentButton } from '@fluentui/react-components';
import { Pencil } from 'lucide-react';
import { CategoryIcon, CategoryPill } from '@/components/category-icon';
import { useAppState } from '@/components/app-state';
import { useDialogs } from '@/components/dialogs/dialog-provider';
import type { Kind } from '@/lib/types';

export default function CategoriesPage() {
  const { categories, transactions, toggleArchive } = useAppState();
  const { openCategory } = useDialogs();

  return (
    <>
      <div className="section-toolbar">
        <span>{categories.filter((c) => !c.archived).length} active categories</span>
        <FluentButton
          className="primary-action"
          appearance="primary"
          onClick={() => openCategory()}
        >
          + Add category
        </FluentButton>
      </div>
      {(['expense', 'income'] as Kind[]).map((type) => (
        <section key={type} className="category-section">
          <h3>{type === 'expense' ? 'Expense' : 'Income'} categories</h3>
          <div className="category-grid">
            {categories
              .filter((c) => c.type === type)
              .map((c) => (
                <article
                  className={`panel category-card ${c.archived ? 'archived' : ''}`}
                  key={c.id}
                >
                  <div className="category-card-top">
                    <CategoryIcon category={c} />
                    <div className="category-actions">
                      <button
                        className="icon-button"
                        aria-label={`Edit ${c.name}`}
                        onClick={() => openCategory(c)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button className="text-link" onClick={() => toggleArchive(c.id)}>
                        {c.archived ? 'Restore' : 'Archive'}
                      </button>
                    </div>
                  </div>
                  <h3>
                    <CategoryPill category={c} />
                  </h3>
                  <p>
                    {transactions.filter((t) => t.category === c.id).length} transactions ·{' '}
                    {c.archived ? 'Archived' : 'Active'}
                  </p>
                </article>
              ))}
          </div>
        </section>
      ))}
    </>
  );
}
