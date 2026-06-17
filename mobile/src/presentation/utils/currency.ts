import { Currency } from '../../context/CurrencyContext';

export const CURRENCY_INFO: Record<Currency, { symbol: string; name: string; locale: string }> = {
  BRL: { symbol: 'R$', name: 'Real Brasileiro', locale: 'pt-BR' },
  USD: { symbol: '$', name: 'Dólar Americano', locale: 'en-US' },
  EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' },
  GBP: { symbol: '£', name: 'Libra Esterlina', locale: 'en-GB' },
  ARS: { symbol: '$', name: 'Peso Argentino', locale: 'es-AR' },
  CLP: { symbol: '$', name: 'Peso Chileno', locale: 'es-CL' },
  COP: { symbol: '$', name: 'Peso Colombiano', locale: 'es-CO' },
  MXN: { symbol: '$', name: 'Peso Mexicano', locale: 'es-MX' },
};

export const formatCurrency = (value: number, currency: Currency = 'BRL'): string => {
  const info = CURRENCY_INFO[currency];
  return value.toLocaleString(info.locale, { style: 'currency', currency });
};

export const formatCurrencyUnit = (value: number, currency: Currency = 'BRL'): string => {
  const numericValue = Number.isFinite(value) ? value : 0;
  const fractionDigits = numericValue > 0 && numericValue < 0.01 ? 4 : 2;
  const info = CURRENCY_INFO[currency];

  return numericValue.toLocaleString(info.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};
