'use client';

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { budgetKey } from '@/lib/aggregate';
import { lastDayOfMonth } from '@/lib/dates';
import type { Budgets, Category, Kind, Transaction } from '@/lib/types';
import { useFilters } from '@/lib/use-filters';

type Totals = {
  income: number;
  expense: number;
  incomeCount: number;
  expenseCount: number;
};
type AppStateValue = {
  categories: Category[];
  transactions: Transaction[];
  budgets: Budgets;
  budgetSpending: Budgets;
  budgeting: boolean;
  notice: string;
  loading: boolean;
  error: string;
  transactionTotal: number;
  transactionTotals: Totals;
  reload: () => void;
  setBudgeting: (value: boolean) => Promise<void>;
  notify: (message: string) => void;
  dismissNotice: () => void;
  saveTransaction: (
    transaction: Transaction,
    editingId: string | null,
  ) => Promise<boolean>;
  deleteTransaction: (id: string) => Promise<boolean>;
  saveCategory: (input: {
    id: string | null;
    name: string;
    type: Kind;
    color: string;
    icon: string;
  }) => Promise<boolean>;
  toggleArchive: (id: string) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;
  saveBudget: (
    month: string,
    categoryId: string,
    paise: number,
  ) => Promise<boolean>;
  copyPreviousBudgets: (month: string) => Promise<boolean>;
  getCategory: (id: string) => Category | undefined;
};

const AppStateContext = createContext<AppStateValue | null>(null);
const messageFrom = async (response: Response) =>
  ((await response.json().catch(() => null))?.error?.message as
    | string
    | undefined) ?? 'The request could not be completed.';

export function useAppState(): AppStateValue {
  const value = use(AppStateContext);
  if (!value)
    throw new Error('useAppState must be used inside <AppStateProvider>');
  return value;
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const filters = useFilters();
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budgets>({});
  const [budgetSpending, setBudgetSpending] = useState<Budgets>({});
  const [budgeting, setBudgetingState] = useState(false);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [transactionTotal, setTransactionTotal] = useState(0);
  const [transactionTotals, setTransactionTotals] = useState<Totals>({
    income: 0,
    expense: 0,
    incomeCount: 0,
    expenseCount: 0,
  });
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  const notify = useCallback((message: string) => setNotice(message), []);
  const dismissNotice = useCallback(() => setNotice(''), []);

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(filters.page),
      pageSize: '25',
    });
    if (filters.query) params.set('query', filters.query);
    if (filters.typeFilter !== 'all') params.set('type', filters.typeFilter);
    if (filters.catFilter !== 'all') params.set('category', filters.catFilter);
    if (filters.period === 'year') {
      params.set('from', `${filters.month.slice(0, 4)}-01-01`);
      params.set('to', `${filters.month.slice(0, 4)}-12-31`);
    } else if (filters.period === 'custom') {
      params.set('from', filters.from);
      params.set('to', filters.to);
    } else {
      params.set('from', `${filters.month}-01`);
      params.set('to', lastDayOfMonth(filters.month));
    }
    Promise.all([
      fetch('/api/categories', { signal: controller.signal }),
      fetch(`/api/transactions?${params}`, { signal: controller.signal }),
      fetch(`/api/budgets?month=${filters.month}`, {
        signal: controller.signal,
      }),
      fetch('/api/settings', { signal: controller.signal }),
    ])
      .then(async (responses) => {
        const failed = responses.find((response) => !response.ok);
        if (failed) throw new Error(await messageFrom(failed));
        const [categoryData, transactionData, budgetData, settingsData] =
          await Promise.all(responses.map((response) => response.json()));
        setCategories(categoryData);
        setTransactions(transactionData.items);
        setTransactionTotal(transactionData.total);
        setTransactionTotals(transactionData.totals);
        setBudgets(
          Object.fromEntries(
            budgetData.map(
              (budget: { month: string; category: string; amount: number }) => [
                budgetKey(budget.month, budget.category),
                budget.amount,
              ],
            ),
          ),
        );
        setBudgetSpending(
          Object.fromEntries(
            budgetData.map(
              (budget: { month: string; category: string; spent: number }) => [
                budgetKey(budget.month, budget.category),
                budget.spent,
              ],
            ),
          ),
        );
        setBudgetingState(settingsData.budgetingEnabled);
        setError('');
      })
      .catch((cause) => {
        if (cause.name !== 'AbortError')
          setError(cause.message || 'Unable to load your data.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    filters.catFilter,
    filters.from,
    filters.month,
    filters.page,
    filters.period,
    filters.query,
    filters.to,
    filters.typeFilter,
    revision,
  ]);

  const request = useCallback(async (url: string, init: RequestInit) => {
    const headers = new Headers(init.headers);
    headers.set('content-type', 'application/json');
    const response = await fetch(url, {
      ...init,
      headers,
    }).catch(() => null);
    if (!response?.ok) {
      setError(
        response ? await messageFrom(response) : 'Unable to reach the server.',
      );
      return null;
    }
    setError('');
    return response;
  }, []);

  const saveTransaction = useCallback(
    async (transaction: Transaction, editingId: string | null) => {
      const before = transactions;
      setTransactions((items) =>
        editingId
          ? items.map((item) => (item.id === editingId ? transaction : item))
          : [transaction, ...items],
      );
      const response = await request(
        editingId ? `/api/transactions/${editingId}` : '/api/transactions',
        {
          method: editingId ? 'PUT' : 'POST',
          body: JSON.stringify({
            type: transaction.type,
            amount: transaction.amount,
            date: transaction.date,
            category: transaction.category,
            notes: transaction.notes,
          }),
        },
      );
      if (!response) {
        setTransactions(before);
        return false;
      }
      notify(editingId ? 'Transaction updated' : 'Transaction added');
      reload();
      return true;
    },
    [notify, reload, request, transactions],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      const before = transactions;
      setTransactions((items) => items.filter((item) => item.id !== id));
      const response = await request(`/api/transactions/${id}`, {
        method: 'DELETE',
      });
      if (!response) {
        setTransactions(before);
        return false;
      }
      notify('Transaction deleted');
      reload();
      return true;
    },
    [notify, reload, request, transactions],
  );

  const saveCategory = useCallback(
    async ({
      id,
      ...input
    }: {
      id: string | null;
      name: string;
      type: Kind;
      color: string;
      icon: string;
    }) => {
      const response = await request(
        id ? `/api/categories/${id}` : '/api/categories',
        { method: id ? 'PATCH' : 'POST', body: JSON.stringify(input) },
      );
      if (!response) return false;
      notify(id ? 'Category updated' : 'Category added');
      reload();
      return true;
    },
    [notify, reload, request],
  );

  const toggleArchive = useCallback(
    async (id: string) => {
      const category = categories.find((item) => item.id === id);
      if (!category) return false;
      const response = await request(`/api/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ archived: !category.archived }),
      });
      if (!response) return false;
      notify(category.archived ? 'Category restored' : 'Category archived');
      reload();
      return true;
    },
    [categories, notify, reload, request],
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      const response = await request(`/api/categories/${id}`, {
        method: 'DELETE',
      });
      if (!response) return false;
      notify('Category deleted');
      reload();
      return true;
    },
    [notify, reload, request],
  );

  const saveBudget = useCallback(
    async (month: string, category: string, amount: number) => {
      const response = await request('/api/budgets', {
        method: 'PUT',
        body: JSON.stringify({ month, category, amount }),
      });
      if (!response) return false;
      notify(amount ? 'Monthly budget saved' : 'Monthly budget removed');
      reload();
      return true;
    },
    [notify, reload, request],
  );

  const copyPreviousBudgets = useCallback(
    async (month: string) => {
      const response = await request('/api/budgets/copy', {
        method: 'POST',
        body: JSON.stringify({ month }),
      });
      if (!response) return false;
      notify('Previous month budgets copied');
      reload();
      return true;
    },
    [notify, reload, request],
  );

  const setBudgeting = useCallback(
    async (value: boolean) => {
      const before = budgeting;
      setBudgetingState(value);
      const response = await request('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ budgetingEnabled: value }),
      });
      if (!response) setBudgetingState(before);
      else
        notify(
          value
            ? 'Category budgeting enabled'
            : 'Category budgeting turned off',
        );
    },
    [budgeting, notify, request],
  );

  const getCategory = useCallback(
    (id: string) => categories.find((category) => category.id === id),
    [categories],
  );
  const value = useMemo(
    () => ({
      categories,
      transactions,
      budgets,
      budgetSpending,
      budgeting,
      notice,
      loading,
      error,
      transactionTotal,
      transactionTotals,
      reload,
      setBudgeting,
      notify,
      dismissNotice,
      saveTransaction,
      deleteTransaction,
      saveCategory,
      toggleArchive,
      deleteCategory,
      saveBudget,
      copyPreviousBudgets,
      getCategory,
    }),
    [
      categories,
      transactions,
      budgets,
      budgetSpending,
      budgeting,
      notice,
      loading,
      error,
      transactionTotal,
      transactionTotals,
      reload,
      setBudgeting,
      notify,
      dismissNotice,
      saveTransaction,
      deleteTransaction,
      saveCategory,
      toggleArchive,
      deleteCategory,
      saveBudget,
      copyPreviousBudgets,
      getCategory,
    ],
  );
  return <AppStateContext value={value}>{children}</AppStateContext>;
}
