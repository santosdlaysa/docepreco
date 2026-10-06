/**
 * Nomes de produtos avulsos usados recentemente (venda sem receita). Igual ao
 * customProductStorage do app, mas no localStorage deste navegador.
 */
const KEY = 'docepreco_custom_products';
const MAX = 50;

export function getCustomProducts(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((n): n is string => typeof n === 'string') : [];
  } catch {
    return [];
  }
}

export function addCustomProduct(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  try {
    const rest = getCustomProducts().filter(n => n.toLowerCase() !== trimmed.toLowerCase());
    localStorage.setItem(KEY, JSON.stringify([trimmed, ...rest].slice(0, MAX)));
  } catch { /* armazenamento indisponível: só não lembra o nome */ }
}

export type DiscountType = 'fixed' | 'percent';

/** Desconto em R$, limitado ao subtotal (mesma regra do app). */
export function computeDiscountAmount(subtotal: number, type: DiscountType, value: number): number {
  if (!value) return 0;
  const amount = type === 'percent' ? (subtotal * value) / 100 : value;
  return Math.max(0, Math.min(amount, subtotal));
}
