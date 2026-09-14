export type Kind = 'income' | 'expense';

export type Category = {
  id: string;
  name: string;
  type: Kind;
  color: string;
  icon?: string;
  archived?: boolean;
  transactionCount?: number;
};

export type Transaction = {
  id: string;
  type: Kind;
  /** Always integer paise. Never a float — see D-005. */
  amount: number;
  /** `YYYY-MM-DD`, as entered. No timezone attached. */
  date: string;
  category: string;
  notes: string;
};

/** Keyed `${month}:${categoryId}`, e.g. `2026-09:food`. Values are paise. */
export type Budgets = Record<string, number>;

export type Period = 'month' | 'year' | 'custom';
