'use client';

import { Search } from 'lucide-react';
import { useAppState } from '@/components/app-state';
import { useFilters } from '@/lib/use-filters';

export function FilterBar() {
  const { categories } = useAppState();
  const { query, typeFilter, catFilter, period, from, to, setFilters } =
    useFilters();

  return (
    <div className="filter-bar">
      <div className="search">
        <Search size={17} />
        <input
          aria-label="Search transactions"
          placeholder="Search transactions…"
          value={query}
          onChange={(e) => setFilters({ query: e.target.value, page: 1 })}
        />
      </div>
      <select
        aria-label="Transaction type"
        value={typeFilter}
        onChange={(e) => setFilters({ typeFilter: e.target.value, page: 1 })}
      >
        <option value="all">All types</option>
        <option value="income">Income</option>
        <option value="expense">Expenses</option>
      </select>
      <select
        aria-label="Category filter"
        value={catFilter}
        onChange={(e) => setFilters({ catFilter: e.target.value, page: 1 })}
      >
        <option value="all">All categories</option>
        {categories
          .filter((c) => !c.archived)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
      </select>
      <select
        aria-label="Reporting period"
        value={period}
        onChange={(e) => setFilters({ period: e.target.value, page: 1 })}
      >
        <option value="month">Monthly</option>
        <option value="year">Yearly</option>
        <option value="custom">Custom dates</option>
      </select>
      {period === 'custom' && (
        <>
          <input
            aria-label="Start date"
            type="date"
            value={from}
            onChange={(e) => setFilters({ from: e.target.value, page: 1 })}
          />
          <input
            aria-label="End date"
            type="date"
            min={from}
            value={to}
            onChange={(e) => setFilters({ to: e.target.value, page: 1 })}
          />
        </>
      )}
    </div>
  );
}
