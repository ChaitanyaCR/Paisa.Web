'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppState } from '@/components/app-state';
import { navItems } from '@/lib/navigation';
import { hrefWithMonth, useFilters } from '@/lib/use-filters';

export function MobileNav() {
  const pathname = usePathname();
  const { budgeting } = useAppState();
  const { month } = useFilters();

  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {navItems
        .filter((item) => !item.requiresBudgeting || budgeting)
        .map(({ name, href, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={name}
              href={hrefWithMonth(href, month)}
              className={active ? 'active' : ''}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={20} />
              <span>{name}</span>
            </Link>
          );
        })}
    </nav>
  );
}
