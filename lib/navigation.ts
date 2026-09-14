import {
  ArrowLeftRight,
  ChartNoAxesCombined,
  LayoutDashboard,
  Settings,
  Tags,
  Wallet,
} from 'lucide-react';

export type NavItem = {
  name: string;
  href: string;
  icon: typeof Wallet;
  /** Only shown when category budgeting is switched on. */
  requiresBudgeting?: boolean;
};

export const navItems: NavItem[] = [
  { name: 'Overview', href: '/overview', icon: LayoutDashboard },
  { name: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { name: 'Analytics', href: '/analytics', icon: ChartNoAxesCombined },
  { name: 'Budgets', href: '/budgets', icon: Wallet, requiresBudgeting: true },
  { name: 'Categories', href: '/categories', icon: Tags },
  { name: 'Settings', href: '/settings', icon: Settings },
];

/** Heading copy per page, keyed by nav name. */
export const pageCopy: Record<string, { eyebrow: string; title: string; lead: string }> = {
  Overview: {
    eyebrow: 'YOUR MONEY, AT A GLANCE',
    title: 'A little clarity, every day.',
    lead: 'Here’s how your month is shaping up.',
  },
  Transactions: {
    eyebrow: 'A CLEARER PICTURE',
    title: 'Transactions',
    lead: 'The everyday details behind your bigger picture.',
  },
  Analytics: {
    eyebrow: 'A CLEARER PICTURE',
    title: 'Analytics',
    lead: 'Find the patterns. Make more informed choices.',
  },
  Budgets: {
    eyebrow: 'A CLEARER PICTURE',
    title: 'Budgets',
    lead: 'Give your spending a little direction.',
  },
  Categories: {
    eyebrow: 'A CLEARER PICTURE',
    title: 'Categories',
    lead: 'Organise your money in a way that makes sense to you.',
  },
  Settings: {
    eyebrow: 'A CLEARER PICTURE',
    title: 'Settings',
    lead: 'Make this space your own.',
  },
};

/** Pages that show the month picker. */
export const monthScopedPages = ['Overview', 'Transactions', 'Analytics', 'Budgets'];

/** Pages that show the "Add transaction" button. */
export const entryPages = ['Overview', 'Transactions', 'Analytics'];

export function navNameForPath(pathname: string): string {
  return navItems.find((item) => pathname.startsWith(item.href))?.name ?? 'Overview';
}
