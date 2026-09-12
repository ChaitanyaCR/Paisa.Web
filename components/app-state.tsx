'use client';

import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';
import {
  initialBudgets,
  initialCategories,
  initialTransactions,
} from '@/lib/sample-data';
import type { Budgets, Category, Kind, Transaction } from '@/lib/types';

/**
 * In-memory store standing in for the backend. This is the seam Phase 2 replaces:
 * the same interface, backed by `/api/*` instead of `useState`. Pages and feature
 * components talk to this and never to the data directly, so swapping the
 * implementation does not touch them.
 */
type AppStateValue = {
  categories: Category[];
  transactions: Transaction[];
  budgets: Budgets;
  budgeting: boolean;
  notice: string;

  setBudgeting: (value: boolean) => void;
  notify: (message: string) => void;
  dismissNotice: () => void;

  saveTransaction: (transaction: Transaction, editingId: string | null) => void;
  deleteTransaction: (id: string) => void;
  saveCategory: (input: {
    id: string | null;
    name: string;
    type: Kind;
    color: string;
  }) => void;
  toggleArchive: (id: string) => void;
  saveBudget: (month: string, categoryId: string, paise: number) => void;

  getCategory: (id: string) => Category | undefined;
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function useAppState(): AppStateValue {
  const value = use(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside <AppStateProvider>');
  return value;
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState(initialCategories);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [budgets, setBudgets] = useState<Budgets>(initialBudgets);
  const [budgeting, setBudgeting] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timeout);
  }, [notice]);

  const notify = useCallback((message: string) => setNotice(message), []);
  const dismissNotice = useCallback(() => setNotice(''), []);

  const saveTransaction = useCallback(
    (transaction: Transaction, editingId: string | null) => {
      setTransactions((old) =>
        editingId
          ? old.map((t) => (t.id === editingId ? transaction : t))
          : [...old, transaction],
      );
      setNotice(editingId ? 'Transaction updated' : 'Transaction added');
    },
    [],
  );

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((old) => old.filter((t) => t.id !== id));
    setNotice('Transaction deleted');
  }, []);

  const saveCategory = useCallback(
    ({
      id,
      name,
      type,
      color,
    }: {
      id: string | null;
      name: string;
      type: Kind;
      color: string;
    }) => {
      setCategories((old) =>
        id
          ? old.map((c) => (c.id === id ? { ...c, name, color } : c))
          : [...old, { id: crypto.randomUUID(), name, type, color }],
      );
      setNotice(id ? 'Category updated' : 'Category added');
    },
    [],
  );

  const toggleArchive = useCallback((id: string) => {
    setCategories((old) => {
      const next = old.map((c) => (c.id === id ? { ...c, archived: !c.archived } : c));
      setNotice(
        next.find((c) => c.id === id)?.archived ? 'Category archived' : 'Category restored',
      );
      return next;
    });
  }, []);

  const saveBudget = useCallback((month: string, categoryId: string, paise: number) => {
    setBudgets((old) => ({ ...old, [`${month}:${categoryId}`]: paise }));
    setNotice('Monthly budget saved');
  }, []);

  const getCategory = useCallback(
    (id: string) => categories.find((c) => c.id === id),
    [categories],
  );

  const value = useMemo(
    () => ({
      categories,
      transactions,
      budgets,
      budgeting,
      notice,
      setBudgeting,
      notify,
      dismissNotice,
      saveTransaction,
      deleteTransaction,
      saveCategory,
      toggleArchive,
      saveBudget,
      getCategory,
    }),
    [
      categories,
      transactions,
      budgets,
      budgeting,
      notice,
      notify,
      dismissNotice,
      saveTransaction,
      deleteTransaction,
      saveCategory,
      toggleArchive,
      saveBudget,
      getCategory,
    ],
  );

  return <AppStateContext value={value}>{children}</AppStateContext>;
}
