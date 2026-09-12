'use client';

import { Button as FluentButton } from '@fluentui/react-components';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppState } from '@/components/app-state';
import { BudgetDialog } from '@/components/dialogs/budget-dialog';
import { CategoryDialog } from '@/components/dialogs/category-dialog';
import { useDialogs } from '@/components/dialogs/dialog-provider';
import { TransactionDialog } from '@/components/dialogs/transaction-dialog';
import { monthLabel } from '@/lib/dates';
import { useFilters } from '@/lib/use-filters';

function title(modal: string | null, editing: string | null): string {
  if (modal === 'transaction') return editing ? 'Edit transaction' : 'A new entry';
  if (modal === 'category') return editing ? 'Edit category' : 'Add category';
  if (modal === 'budget') return 'Set a monthly budget';
  return 'Delete this transaction?';
}

function description(modal: string | null, month: string): string {
  if (modal === 'transaction') return 'A small moment to keep your money in focus.';
  if (modal === 'budget') return `Expense limit for ${monthLabel(month)}.`;
  if (modal === 'delete') return 'This will also update your totals and budget progress.';
  return 'Keep things organised, your way.';
}

export function AppDialogs() {
  const { modal, editing, close, openTransaction, seedTransaction } = useDialogs();
  const { deleteTransaction } = useAppState();
  const { month } = useFilters();

  return (
    <Dialog
      open={modal !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="entry-dialog">
        <DialogTitle>{title(modal, editing)}</DialogTitle>
        <DialogDescription>{description(modal, month)}</DialogDescription>

        {/* Keyed so reopening the dialog starts from the new seed rather than
            keeping the previous entry's form state. */}
        {modal === 'transaction' && (
          <TransactionDialog key={editing ?? 'new'} month={month} />
        )}
        {modal === 'category' && <CategoryDialog key={editing ?? 'new'} />}
        {modal === 'budget' && <BudgetDialog month={month} />}

        {modal === 'delete' && (
          <div className="dialog-actions">
            <FluentButton
              className="secondary-action"
              appearance="secondary"
              onClick={() => openTransaction(seedTransaction ?? undefined)}
            >
              Keep transaction
            </FluentButton>
            <FluentButton
              className="destructive-action"
              appearance="primary"
              onClick={() => {
                if (editing) deleteTransaction(editing);
                close();
              }}
            >
              Delete transaction
            </FluentButton>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
