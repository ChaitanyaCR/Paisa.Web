import { describe, expect, it } from 'vitest';
import { money, percentage, ratio, toPaise, toRupees } from '../lib/money';

describe('money', () => {
  it('drops decimals for whole rupee amounts', () => {
    expect(money(8500000)).toBe('₹85,000');
    expect(money(0)).toBe('₹0');
  });

  it('keeps two decimals when there are paise', () => {
    expect(money(349950)).toBe('₹3,499.50');
  });

  it('groups in the Indian system (lakh, crore)', () => {
    expect(money(10000000)).toBe('₹1,00,000');
    expect(money(1000000000)).toBe('₹1,00,00,000');
  });

  it('formats negative amounts', () => {
    expect(money(-250000)).toBe('-₹2,500');
  });
});

describe('toPaise / toRupees', () => {
  it('round-trips a rupee string', () => {
    expect(toPaise('3499.50')).toBe(349950);
    expect(toRupees(349950)).toBe(3499.5);
  });

  it('rounds rather than truncating, so float input cannot lose a paisa', () => {
    expect(toPaise(0.07)).toBe(7);
    expect(toPaise(1234.565)).toBe(123457);
  });
});

describe('percentage / ratio', () => {
  it('computes a whole percentage', () => {
    expect(percentage(2500, 10000)).toBe(25);
  });

  it('returns 0 rather than NaN when the whole is zero', () => {
    expect(percentage(100, 0)).toBe(0);
    expect(ratio(100, 0)).toBe(0);
  });

  it('clamps the ratio at 100 so an overspent bar cannot overflow', () => {
    expect(ratio(150, 100)).toBe(100);
    expect(percentage(150, 100)).toBe(150);
  });
});
