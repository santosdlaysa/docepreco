import { getLang } from '../i18n';

/** Moedas suportadas (mesma lista do app — mobile/src/presentation/utils/currency.ts). */
export const CURRENCIES = {
  BRL: { name: 'Real Brasileiro', locale: 'pt-BR' },
  USD: { name: 'Dólar Americano', locale: 'en-US' },
  EUR: { name: 'Euro', locale: 'de-DE' },
  GBP: { name: 'Libra Esterlina', locale: 'en-GB' },
  NZD: { name: 'Dólar Neozelandês', locale: 'en-NZ' },
  ARS: { name: 'Peso Argentino', locale: 'es-AR' },
  CLP: { name: 'Peso Chileno', locale: 'es-CL' },
  COP: { name: 'Peso Colombiano', locale: 'es-CO' },
  MXN: { name: 'Peso Mexicano', locale: 'es-MX' },
} as const;
export type Currency = keyof typeof CURRENCIES;

const CURRENCY_KEY = 'docepreco_currency';

function readCurrency(): Currency {
  try {
    const v = localStorage.getItem(CURRENCY_KEY);
    if (v && v in CURRENCIES) return v as Currency;
  } catch { /* storage indisponível */ }
  return 'BRL';
}

/** Moeda escolhida pela confeiteira (fica no navegador, como no app fica no aparelho). */
let currentCurrency: Currency = readCurrency();
export const getCurrency = (): Currency => currentCurrency;
export function setCurrency(c: Currency): void {
  currentCurrency = c;
  try { localStorage.setItem(CURRENCY_KEY, c); } catch { /* ignora */ }
}

/** Formata na moeda escolhida (o nome ficou por compatibilidade: padrão é BRL). */
export function formatBRL(value: number): string {
  const c = currentCurrency;
  return new Intl.NumberFormat(CURRENCIES[c].locale, { style: 'currency', currency: c }).format(value || 0);
}

export function formatBRLUnit(value: number): string {
  const numericValue = Number.isFinite(value) ? value : 0;
  const fractionDigits = numericValue > 0 && numericValue < 0.01 ? 4 : 2;
  const c = currentCurrency;

  return new Intl.NumberFormat(CURRENCIES[c].locale, {
    style: 'currency',
    currency: c,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(numericValue);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString(getLang() === 'en' ? 'en-US' : 'pt-BR');
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
