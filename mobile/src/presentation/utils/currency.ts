import { Currency } from '../../context/CurrencyContext';

export const CURRENCY_INFO: Record<Currency, { symbol: string; name: string; locale: string }> = {
  BRL: { symbol: 'R$', name: 'Real Brasileiro', locale: 'pt-BR' },
  USD: { symbol: '$', name: 'Dólar Americano', locale: 'en-US' },
  EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' },
  GBP: { symbol: '£', name: 'Libra Esterlina', locale: 'en-GB' },
  NZD: { symbol: '$', name: 'Dólar Neozelandês', locale: 'en-NZ' },
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
  const magnitude = Math.abs(numericValue);
  const isSmall = magnitude > 0 && magnitude < 0.01;
  // Unit costs can be fractions of a cent. Show at least two significant
  // digits without changing the value used by recipe calculations.
  const maxUnitDecimals = 8;
  const smallestDisplayedUnit = 10 ** -maxUnitDecimals;
  const belowDisplayPrecision = isSmall && magnitude < smallestDisplayedUnit;
  const fractionDigits = isSmall
    ? Math.min(maxUnitDecimals, Math.max(4, Math.ceil(-Math.log10(magnitude)) + 1))
    : 2;
  const info = CURRENCY_INFO[currency];
  const displayedValue = belowDisplayPrecision
    ? Math.sign(numericValue) * smallestDisplayedUnit
    : numericValue;
  const formatted = displayedValue.toLocaleString(info.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: isSmall ? 4 : 2,
    maximumFractionDigits: fractionDigits,
  });
  // Never imply that a known non-zero cost is free at the display limit.
  return belowDisplayPrecision ? `${numericValue > 0 ? '<' : '>'} ${formatted}` : formatted;
};
