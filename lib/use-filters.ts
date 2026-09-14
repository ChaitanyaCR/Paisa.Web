'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { lastDayOfMonth } from './dates';
import { DEFAULT_MONTH } from './sample-data';
import type { Period } from './types';

export type FilterState = {
  month: string;
  query: string;
  typeFilter: string;
  catFilter: string;
  period: Period;
  from: string;
  to: string;
};

/**
 * Filter state lives in the URL, so a filtered view is shareable and survives a
 * refresh — and navigating to a bare route naturally resets the filters, which is
 * what the prototype's `navigate()` did by hand.
 */
export function useFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo<FilterState>(() => {
    const month = searchParams.get('month') ?? DEFAULT_MONTH;
    return {
      month,
      query: searchParams.get('q') ?? '',
      typeFilter: searchParams.get('type') ?? 'all',
      catFilter: searchParams.get('category') ?? 'all',
      period: (searchParams.get('period') ?? 'month') as Period,
      from: searchParams.get('from') ?? `${month}-01`,
      to: searchParams.get('to') ?? lastDayOfMonth(month),
    };
  }, [searchParams]);

  const setFilters = useCallback(
    (patch: Partial<Record<keyof FilterState, string>>) => {
      const params = new URLSearchParams(searchParams);
      const keys: Record<keyof FilterState, string> = {
        month: 'month',
        query: 'q',
        typeFilter: 'type',
        catFilter: 'category',
        period: 'period',
        from: 'from',
        to: 'to',
      };
      const defaults: Record<string, string> = {
        q: '',
        type: 'all',
        category: 'all',
        period: 'month',
      };

      for (const [key, value] of Object.entries(patch)) {
        const param = keys[key as keyof FilterState];
        // Keep the URL short: a filter at its default is simply absent.
        if (value === undefined || value === defaults[param]) params.delete(param);
        else params.set(param, value);
      }

      const search = params.toString();
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { ...filters, setFilters };
}

/**
 * Carries the selected month across a navigation. The prototype kept `month` in
 * component state while resetting the other filters; this reproduces that.
 */
export function hrefWithMonth(href: string, month: string): string {
  return month === DEFAULT_MONTH ? href : `${href}?month=${month}`;
}

/** A link that lands on the transactions page pre-filtered to one category. */
export function categoryHref(categoryId: string, month: string): string {
  const params = new URLSearchParams({ category: categoryId });
  if (month !== DEFAULT_MONTH) params.set('month', month);
  return `/transactions?${params.toString()}`;
}
