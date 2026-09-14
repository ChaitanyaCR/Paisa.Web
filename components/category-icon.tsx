import { createElement } from 'react';
import { iconFor } from '@/lib/category-icons';
import type { Category } from '@/lib/types';

export function CategoryIcon({ category }: { category: Category | undefined }) {
  return (
    <span
      className="category-icon"
      style={{ background: `${category?.color}19`, color: category?.color }}
    >
      {/* `createElement` rather than a capitalised local, so the React compiler
          can see this is a lookup and not a component defined during render. */}
      {createElement(iconFor(category?.id ?? ''), { size: 19 })}
    </span>
  );
}

export function CategoryPill({
  category,
  className = '',
}: {
  category: Category | undefined;
  className?: string;
}) {
  return (
    <span
      className={`category-pill ${className}`.trim()}
      style={{
        background: `${category?.color}20`,
        borderColor: `${category?.color}55`,
      }}
    >
      <i style={{ background: category?.color }} />
      {category?.name}
    </span>
  );
}
