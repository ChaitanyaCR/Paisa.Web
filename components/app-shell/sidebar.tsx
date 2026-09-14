'use client';

import { Leaf, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppState } from '@/components/app-state';
import { hrefWithMonth, useFilters } from '@/lib/use-filters';
import { navItems } from '@/lib/navigation';

export function Sidebar() {
  const pathname = usePathname();
  const { budgeting } = useAppState();
  const { month } = useFilters();

  return (
    <aside className="sidebar">
      <Link className="brand" href={hrefWithMonth('/overview', month)}>
        <span className="brand-symbol">
          <Leaf size={23} />
        </span>
        paisa<span className="brand-period">.</span>
      </Link>
      <div className="workspace-label">YOUR PERSONAL SPACE</div>
      <nav aria-label="Main navigation">
        {navItems
          .filter((item) => !item.requiresBudgeting || budgeting)
          .map(({ name, href, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={name}
                href={hrefWithMonth(href, month)}
                className={`nav-item ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={19} />
                <span>{name}</span>
                {active && <span className="nav-dot" />}
              </Link>
            );
          })}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-tip">
          <Leaf size={23} />
          <h4>Small steps. More clarity.</h4>
          <p>A quick daily check-in goes a long way.</p>
        </div>
        <Link className="profile" href="/settings">
          <span className="avatar">C</span>
          <span>
            <strong>Chaitanya</strong>
            <small>Personal account</small>
          </span>
          <Settings size={17} />
        </Link>
      </div>
    </aside>
  );
}
