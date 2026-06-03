export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export function formatDate(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR');
}

/** Data de hoje no formato YYYY-MM-DD para inputs type="date". */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Converte um nome em slug de URL (sem acentos, minúsculo, com hífens). */
export function slugify(s: string): string {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'app';
}

export const UNIT_LABELS: Record<string, string> = {
  g: 'g (gramas)',
  kg: 'kg (quilos)',
  ml: 'ml (mililitros)',
  l: 'l (litros)',
  unit: 'un (unidades)',
};
