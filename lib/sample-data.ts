import type { Budgets, Category, Transaction } from './types';

/**
 * Seed data for the prototype. Phase 2.7 replaces this: new accounts get the
 * starter categories only, never the sample transactions.
 */

export const initialCategories: Category[] = [
  { id: 'salary', name: 'Salary', type: 'income', color: '#53846e' },
  { id: 'freelance', name: 'Freelance', type: 'income', color: '#799582' },
  { id: 'home', name: 'Rent & bills', type: 'expense', color: '#427c65' },
  { id: 'food', name: 'Food & groceries', type: 'expense', color: '#a1b88d' },
  { id: 'shopping', name: 'Shopping', type: 'expense', color: '#e2b483' },
  { id: 'transport', name: 'Transport', type: 'expense', color: '#9ca8bb' },
  { id: 'health', name: 'Health & wellness', type: 'expense', color: '#bb9aa5' },
];

export const categoryColors = [
  '#3565c9',
  '#7855bc',
  '#b65e88',
  '#bb742c',
  '#328b91',
  '#61728c',
  '#458259',
  '#ba5555',
];

const seeds = [
  ['salary', 85000, 1, 'Monthly salary'],
  ['home', 18000, 2, 'September rent'],
  ['food', 2450, 3, 'Weekly groceries'],
  ['transport', 1200, 4, 'Fuel refill'],
  ['freelance', 12500, 5, 'Website project'],
  ['shopping', 3499, 6, 'A little wardrobe refresh'],
  ['food', 850, 7, 'Dinner with friends'],
  ['health', 1800, 8, 'Gym membership'],
  ['food', 1620, 9, 'Groceries & essentials'],
  ['transport', 340, 10, 'Cab to office'],
  ['food', 420, 11, 'Coffee & lunch'],
] as const;

export const initialTransactions: Transaction[] = [7, 8, 9].flatMap((month) =>
  seeds.map(([category, amount, day, notes], i) => ({
    id: `${month}-${i}`,
    category,
    amount: Math.round(amount * (month === 9 ? 1 : month === 8 ? 0.91 : 0.86) * 100),
    date: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    notes: category === 'home' ? 'Monthly rent' : notes,
    type: (category === 'salary' || category === 'freelance'
      ? 'income'
      : 'expense') as Transaction['type'],
  })),
);

export const initialBudgets: Budgets = {
  '2026-09:home': 2000000,
  '2026-09:food': 1000000,
  '2026-09:shopping': 500000,
  '2026-09:transport': 300000,
  '2026-09:health': 200000,
};

/** The month the prototype opens on. */
export const DEFAULT_MONTH = '2026-09';
