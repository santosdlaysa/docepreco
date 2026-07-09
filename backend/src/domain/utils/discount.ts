export type DiscountType = 'percent' | 'fixed';

export function computeDiscountAmount(
  subtotal: number,
  type: DiscountType | null | undefined,
  value: number | null | undefined
): number {
  if (!type || !value) return 0;
  const amount = type === 'percent' ? (subtotal * value) / 100 : value;
  return Math.max(0, Math.min(amount, subtotal));
}
