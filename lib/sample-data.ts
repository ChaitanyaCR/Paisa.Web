import type { Category } from './types';

/**
 * Account seed data. A new account gets these starter categories and nothing
 * else — the prototype's fabricated transactions and budgets were removed once
 * real persistence landed, and must never be reintroduced here.
 */

export const initialCategories: Category[] = [
  {
    id: 'salary',
    name: 'Salary',
    type: 'income',
    color: '#53846e',
    icon: 'salary',
  },
  {
    id: 'freelance',
    name: 'Freelance',
    type: 'income',
    color: '#799582',
    icon: 'freelance',
  },
  {
    id: 'home',
    name: 'Rent & bills',
    type: 'expense',
    color: '#427c65',
    icon: 'home',
  },
  {
    id: 'food',
    name: 'Food & groceries',
    type: 'expense',
    color: '#a1b88d',
    icon: 'food',
  },
  {
    id: 'shopping',
    name: 'Shopping',
    type: 'expense',
    color: '#e2b483',
    icon: 'shopping',
  },
  {
    id: 'transport',
    name: 'Transport',
    type: 'expense',
    color: '#9ca8bb',
    icon: 'transport',
  },
  {
    id: 'health',
    name: 'Health & wellness',
    type: 'expense',
    color: '#bb9aa5',
    icon: 'health',
  },
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
