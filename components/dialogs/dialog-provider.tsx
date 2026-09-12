'use client';

import { createContext, use, useCallback, useMemo, useState } from 'react';
import type { Category, Transaction } from '@/lib/types';

export type ModalKind = 'transaction' | 'category' | 'budget' | 'delete';

type DialogContextValue = {
  modal: ModalKind | null;
  editing: string | null;
  seedTransaction: Transaction | null;
  seedCategory: Category | null;
  seedBudgetCategory: string | null;

  openTransaction: (transaction?: Transaction) => void;
  openCategory: (category?: Category) => void;
  openBudget: (categoryId?: string) => void;
  openDelete: () => void;
  close: () => void;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialogs(): DialogContextValue {
  const value = use(DialogContext);
  if (!value) throw new Error('useDialogs must be used inside <DialogProvider>');
  return value;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<ModalKind | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [seedTransaction, setSeedTransaction] = useState<Transaction | null>(null);
  const [seedCategory, setSeedCategory] = useState<Category | null>(null);
  const [seedBudgetCategory, setSeedBudgetCategory] = useState<string | null>(null);

  const openTransaction = useCallback((transaction?: Transaction) => {
    setEditing(transaction?.id ?? null);
    setSeedTransaction(transaction ?? null);
    setModal('transaction');
  }, []);

  const openCategory = useCallback((category?: Category) => {
    setEditing(category?.id ?? null);
    setSeedCategory(category ?? null);
    setModal('category');
  }, []);

  const openBudget = useCallback((categoryId?: string) => {
    setSeedBudgetCategory(categoryId ?? null);
    setModal('budget');
  }, []);

  const openDelete = useCallback(() => setModal('delete'), []);
  const close = useCallback(() => setModal(null), []);

  const value = useMemo(
    () => ({
      modal,
      editing,
      seedTransaction,
      seedCategory,
      seedBudgetCategory,
      openTransaction,
      openCategory,
      openBudget,
      openDelete,
      close,
    }),
    [
      modal,
      editing,
      seedTransaction,
      seedCategory,
      seedBudgetCategory,
      openTransaction,
      openCategory,
      openBudget,
      openDelete,
      close,
    ],
  );

  return <DialogContext value={value}>{children}</DialogContext>;
}
