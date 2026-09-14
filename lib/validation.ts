import { z } from 'zod';

export const kindSchema = z.enum(['income', 'expense']);
export const idSchema = z.string().trim().min(1).max(100);
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    );
  }, 'Invalid calendar date');
export const monthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/)
  .refine((value) => {
    const month = Number(value.slice(5));
    return month >= 1 && month <= 12;
  }, 'Invalid calendar month');
export const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const amountPaiseSchema = z.number().int().positive();

export const transactionInputSchema = z.object({
  type: kindSchema,
  amount: amountPaiseSchema,
  date: dateSchema,
  category: idSchema,
  notes: z.string().trim().max(500).default(''),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: kindSchema,
  color: colorSchema,
});

export const categoryUpdateSchema = categoryInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0);

export const budgetInputSchema = z.object({
  month: monthSchema,
  category: idSchema,
  amount: z.number().int().min(0),
});

export const settingsInputSchema = z
  .object({
    budgetingEnabled: z.boolean().optional(),
    appearance: z.enum(['light', 'dark', 'system']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0);

export const transactionFiltersSchema = z.object({
  query: z.string().trim().max(100).optional(),
  type: kindSchema.optional(),
  category: idSchema.optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type TransactionInput = z.infer<typeof transactionInputSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type BudgetInput = z.infer<typeof budgetInputSchema>;
export type SettingsInput = z.infer<typeof settingsInputSchema>;
export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;
