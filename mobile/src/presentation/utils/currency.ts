export const formatCurrency = (value: number): string =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatCurrencyUnit = (value: number): string => {
  const numericValue = Number.isFinite(value) ? value : 0;
  const fractionDigits = numericValue > 0 && numericValue < 0.01 ? 4 : 2;

  return numericValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};
