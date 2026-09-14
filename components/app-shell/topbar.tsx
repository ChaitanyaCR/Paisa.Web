'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems } from '@/lib/navigation';
import { useAuthUser } from '@/components/auth-user';

export function Topbar() {
  const pathname = usePathname();
  const current =
    navItems.find((item) => pathname.startsWith(item.href))?.name ?? 'Overview';
  const user = useAuthUser();

  return (
    <header className="topbar">
      <span className="breadcrumb">
        My workspace <ChevronRight size={13} />
        <strong>{current}</strong>
      </span>
      <Link
        className="avatar mobile-avatar"
        aria-label="Account settings"
        href="/settings"
      >
        {user?.name.trim().charAt(0).toUpperCase() || '?'}
      </Link>
    </header>
  );
}
