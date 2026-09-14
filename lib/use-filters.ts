'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { currentMonth, lastDayOfMonth } from './dates';
import type { Period } from './types';

export type FilterState = {
  month: string;
  query: string;
  typeFilter: string;
  catFilter: string;
  period: Period;
  from: string;
  to: string;
  page: number;
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
    const month = searchParams.get('month') ?? currentMonth();
    return {
      month,
      query: searchParams.get('q') ?? '',
      typeFilter: searchParams.get('type') ?? 'all',
      catFilter: searchParams.get('category') ?? 'all',
      period: (searchParams.get('period') ?? 'month') as Period,
      from: searchParams.get('from') ?? `${month}-01`,
      to: searchParams.get('to') ?? lastDayOfMonth(month),
      page: Math.max(1, Number(searchParams.get('page')) || 1),
    };
  }, [searchParams]);

  const setFilters = useCallback(
    (patch: Partial<Record<keyof FilterState, string | number>>) => {
      const params = new URLSearchParams(searchParams);
      const keys: Record<keyof FilterState, string> = {
        month: 'month',
        query: 'q',
        typeFilter: 'type',
        catFilter: 'category',
        period: 'period',
        from: 'from',
        to: 'to',
        page: 'page',
      };
      const defaults: Record<string, string> = {
        q: '',
        type: 'all',
        category: 'all',
        period: 'month',
        page: '1',
      };

      for (const [key, value] of Object.entries(patch)) {
        const param = keys[key as keyof FilterState];
        // Keep the URL short: a filter at its default is simply absent.
        if (value === undefined || value === defaults[param])
          params.delete(param);
        else params.set(param, String(value));
      }

      const search = params.toString();
      router.replace(search ? `${pathname}?${search}` : pathname, {
        scroll: false,
      });
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
  return month === currentMonth() ? href : `${href}?month=${month}`;
}

/** A link that lands on the transactions page pre-filtered to one category. */
export function categoryHref(categoryId: string, month: string): string {
  const params = new URLSearchParams({ category: categoryId });
  if (month !== currentMonth()) params.set('month', month);
  return `/transactions?${params.toString()}`;
}
