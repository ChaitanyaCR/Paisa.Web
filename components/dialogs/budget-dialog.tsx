'use client';

import { Button as FluentButton } from '@fluentui/react-components';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useAppState } from '@/components/app-state';
import { useDialogs } from '@/components/dialogs/dialog-provider';
import { budgetKey } from '@/lib/aggregate';
import { toPaise, toRupees } from '@/lib/money';

export function BudgetDialog({ month }: { month: string }) {
  const { categories, budgets, saveBudget } = useAppState();
  const { seedBudgetCategory, close } = useDialogs();

  const expenseCategories = categories.filter(
    (c) => c.type === 'expense' && !c.archived,
  );
  const initialCategory = seedBudgetCategory ?? expenseCategories[0]?.id ?? '';
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [amount, setAmount] = useState(
    String(toRupees(budgets[budgetKey(month, initialCategory)] ?? 0)),
  );

  const submit = async (event: React.SyntheticEvent) => {
    event.preventDefault();
    if (await saveBudget(month, categoryId, toPaise(amount))) close();
  };

  return (
    <form onSubmit={submit}>
      <label>
        Expense category
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setAmount(
              String(toRupees(budgets[budgetKey(month, e.target.value)] ?? 0)),
            );
          }}
        >
          {expenseCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Monthly limit (INR)
        <Input
          required
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <p className="preview-note">
        Set to 0 to remove the limit for this month.
      </p>
      <FluentButton type="submit" appearance="primary">
        Save budget
      </FluentButton>
    </form>
  );
}
