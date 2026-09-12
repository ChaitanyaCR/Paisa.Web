'use client';

import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Trash2,
} from 'lucide-react';
import { Button as FluentButton } from '@fluentui/react-components';
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppState } from '@/components/app-state';
import { useDialogs } from '@/components/dialogs/dialog-provider';
import { formatFullDate, toDateKey } from '@/lib/dates';
import { toPaise, toRupees } from '@/lib/money';
import type { Kind, Transaction } from '@/lib/types';

type Entry = {
  type: Kind;
  amount: string;
  date: string;
  category: string;
  notes: string;
};

function initialEntry(
  seed: Transaction | null,
  categories: ReturnType<typeof useAppState>['categories'],
  month: string,
): Entry {
  if (seed) return { ...seed, amount: String(toRupees(seed.amount)) };
  return {
    type: 'expense',
    amount: '',
    date: `${month}-11`,
    category: categories.find((c) => c.type === 'expense' && !c.archived)?.id ?? '',
    notes: '',
  };
}

export function TransactionDialog({ month }: { month: string }) {
  const { categories, saveTransaction } = useAppState();
  const { editing, seedTransaction, openDelete, close } = useDialogs();
  const [entry, setEntry] = useState<Entry>(() =>
    initialEntry(seedTransaction, categories, month),
  );
  const [error, setError] = useState('');

  const selected = categories.find((c) => c.id === entry.category);

  const submit = (event: React.SyntheticEvent) => {
    event.preventDefault();
    const amount = Number(entry.amount);
    if (!Number.isFinite(amount) || amount <= 0 || !entry.category || !entry.date) {
      setError('Add a valid amount, date, and category before saving.');
      return;
    }
    saveTransaction(
      { ...entry, id: editing ?? crypto.randomUUID(), amount: toPaise(amount) },
      editing,
    );
    close();
  };

  return (
    <form onSubmit={submit}>
      <div className="type-toggle">
        {(['expense', 'income'] as Kind[]).map((type) => (
          <button
            key={type}
            type="button"
            className={entry.type === type ? 'selected' : ''}
            onClick={() =>
              setEntry({
                ...entry,
                type,
                category:
                  categories.find((c) => c.type === type && !c.archived)?.id ?? '',
              })
            }
          >
            {type === 'expense' ? <ArrowUpRight size={17} /> : <ArrowDownLeft size={17} />}{' '}
            {type === 'expense' ? 'Expense' : 'Income'}
          </button>
        ))}
      </div>
      <label>
        Amount (INR)
        <Input
          autoFocus
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          placeholder="₹ 0.00"
          value={entry.amount}
          aria-invalid={Boolean(
            error && (!Number(entry.amount) || Number(entry.amount) <= 0),
          )}
          onChange={(e) => {
            setEntry({ ...entry, amount: e.target.value });
            setError('');
          }}
        />
      </label>
      <div className="form-grid">
        <label>
          Date
          <Popover>
            <PopoverTrigger className="date-trigger" aria-label="Select transaction date">
              <span>{formatFullDate(entry.date)}</span>
              <CalendarDays size={16} />
            </PopoverTrigger>
            <PopoverContent className="transaction-calendar" align="start" sideOffset={8}>
              <Calendar
                mode="single"
                selected={new Date(`${entry.date}T12:00:00`)}
                onSelect={(date) => {
                  if (!date) return;
                  setEntry({ ...entry, date: toDateKey(date) });
                  setError('');
                }}
              />
              <div className="calendar-footer">
                <button
                  type="button"
                  onClick={() => {
                    setEntry({ ...entry, date: toDateKey(new Date()) });
                    setError('');
                  }}
                >
                  Today
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </label>
        <label>
          Category
          <Select
            value={entry.category}
            onValueChange={(category) => {
              setEntry({ ...entry, category: category ?? '' });
              setError('');
            }}
          >
            <SelectTrigger
              className="transaction-select"
              aria-invalid={Boolean(error && !entry.category)}
            >
              <SelectValue className="sr-only" placeholder="Select category" />
              {selected ? (
                <span className="selected-category-value">
                  <i className="select-color" style={{ background: selected.color }} />
                  {selected.name}
                </span>
              ) : (
                <span className="select-placeholder">Select category</span>
              )}
            </SelectTrigger>
            <SelectContent className="transaction-select-menu" align="start">
              {categories
                .filter(
                  (c) => c.type === entry.type && (!c.archived || c.id === entry.category),
                )
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="select-option-label">
                      <i className="select-color" style={{ background: c.color }} />
                      <span>{c.name}</span>
                    </span>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </label>
      </div>
      <label>
        Notes <span className="optional">optional</span>
        <Input
          placeholder="What was it for?"
          value={entry.notes}
          maxLength={160}
          onChange={(e) => setEntry({ ...entry, notes: e.target.value })}
        />
      </label>
      {error && (
        <p role="alert" className="form-validation">
          <span>!</span>
          {error}
        </p>
      )}
      <div className="dialog-actions">
        {editing ? (
          <button type="button" className="delete-link" onClick={openDelete}>
            <Trash2 size={16} />
            Delete
          </button>
        ) : (
          <span />
        )}
        <FluentButton type="submit" appearance="primary">
          {editing ? 'Save changes' : 'Add transaction'}
        </FluentButton>
      </div>
    </form>
  );
}
