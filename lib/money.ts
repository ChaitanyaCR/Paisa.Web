/**
 * Formats integer paise as Indian rupees. Whole-rupee amounts drop the decimals,
 * which is why the fraction digits depend on the value.
 */
export function money(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: paise % 100 ? 2 : 0,
  }).format(paise / 100);
}

/** Rupees as typed into a form → integer paise. */
export function toPaise(rupees: string | number): number {
  return Math.round(Number(rupees) * 100);
}

/** Integer paise → rupees, for populating a form field. */
export function toRupees(paise: number): number {
  return paise / 100;
}

/**
 * `spent / limit` as a whole percentage, guarding the zero-limit case that
 * otherwise yields `Infinity` or `NaN`.
 */
export function percentage(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

/** Same ratio, unrounded and clamped to 0–100, for bar widths. */
export function ratio(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.min((part / whole) * 100, 100);
}
