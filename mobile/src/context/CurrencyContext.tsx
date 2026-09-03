import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Currency = 'BRL' | 'USD' | 'EUR' | 'GBP' | 'NZD' | 'ARS' | 'CLP' | 'COP' | 'MXN';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => Promise<void>;
  loading: boolean;
}

const CURRENCY_STORAGE_KEY = '@docepreco_currency';
const DEFAULT_CURRENCY: Currency = 'BRL';

export const CurrencyContext = createContext<CurrencyContextType>({
  currency: DEFAULT_CURRENCY,
  setCurrency: async () => {},
  loading: true,
});

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const stored = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
        if (stored && isValidCurrency(stored)) {
          setCurrencyState(stored as Currency);
        }
      } catch {
        console.error('Erro ao carregar moeda');
      } finally {
        setLoading(false);
      }
    };

    loadCurrency();
  }, []);

  const setCurrency = async (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    try {
      await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency);
    } catch {
      console.error('Erro ao salvar moeda');
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, loading }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);

export const isValidCurrency = (value: string): value is Currency => {
  return ['BRL', 'USD', 'EUR', 'GBP', 'NZD', 'ARS', 'CLP', 'COP', 'MXN'].includes(value);
};
