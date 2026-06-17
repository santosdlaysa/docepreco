import { useCurrency } from '../../context/CurrencyContext';
import { formatCurrency, formatCurrencyUnit } from '../utils/currency';

export const useCurrencyFormat = () => {
  const { currency } = useCurrency();

  return {
    formatCurrency: (value: number) => formatCurrency(value, currency),
    formatCurrencyUnit: (value: number) => formatCurrencyUnit(value, currency),
  };
};
