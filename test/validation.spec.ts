import { describe, expect, it } from 'vitest';
import {
  budgetInputSchema,
  categoryInputSchema,
  settingsInputSchema,
  transactionInputSchema,
} from '../lib/validation';

describe('API validation', () => {
  it('accepts integer paise and rejects floating point or non-positive amounts', () => {
    const valid = {
      type: 'expense',
      amount: 12345,
      date: '2026-09-12',
      category: 'food',
      notes: '',
    };
    expect(transactionInputSchema.safeParse(valid).success).toBe(true);
    expect(
      transactionInputSchema.safeParse({ ...valid, amount: 12.5 }).success,
    ).toBe(false);
    expect(
      transactionInputSchema.safeParse({ ...valid, amount: 0 }).success,
    ).toBe(false);
  });

  it('validates categories, zero budgets, and non-empty settings patches', () => {
    expect(
      categoryInputSchema.safeParse({
        name: 'Food',
        type: 'expense',
        color: '#a1b88d',
      }).success,
    ).toBe(true);
    expect(
      categoryInputSchema.safeParse({ name: '', type: 'other', color: 'green' })
        .success,
    ).toBe(false);
    expect(
      budgetInputSchema.safeParse({
        month: '2026-09',
        category: 'food',
        amount: 0,
      }).success,
    ).toBe(true);
    expect(settingsInputSchema.safeParse({}).success).toBe(false);
  });
});
