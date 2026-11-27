import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { useCurrency } from '../../context/CurrencyContext';
import { saleApi } from '../../data/api/saleApi';
import { tokenStorage } from '../../data/storage/tokenStorage';
import { impersonationStorage } from '../../data/storage/impersonationStorage';
import { subscribeToSalesChanges } from '../../data/api/salesChanges';
import { localSalesDate, salesOnDate, sumSaleRevenue } from '../../domain/services/todaySales';
import { formatCurrency } from '../utils/currency';

const appGroup = 'group.com.laysadiniz.sweetpricing.saleswidget';
const androidWidget = Platform.OS === 'android'
  ? requireOptionalNativeModule<{ setSummary(summary: string | null): void }>('DocePrecoSalesWidget')
  : null;
const iosWidget = Platform.OS === 'ios'
  ? requireOptionalNativeModule<{
    setString(key: string, value: string, group: string): void;
    remove(key: string, group: string): void;
    reloadWidget(kind: string): void;
  }>('ExtensionStorage')
  : null;

export const isSalesWidgetAvailable = Boolean(androidWidget || iosWidget);

function setSummary(summary: string | null) {
  androidWidget?.setSummary(summary);
  if (iosWidget) {
    if (summary === null) iosWidget.remove('todaySales', appGroup);
    else iosWidget.setString('todaySales', summary, appGroup);
    iosWidget.reloadWidget('TodaySalesWidget');
  }
}

export function useSalesWidget(mode: 'loading' | 'hidden' | 'active', sessionKey: number) {
  const { currency, loading: loadingCurrency } = useCurrency();

  useEffect(() => {
    if (!isSalesWidgetAvailable) return;
    if (mode === 'hidden') {
      setSummary(null);
      return;
    }
    if (mode !== 'active' || loadingCurrency) return;

    let request = 0;
    let active = true;
    let midnightTimer: ReturnType<typeof setTimeout> | undefined;

    const refresh = async () => {
      const currentRequest = ++request;
      clearTimeout(midnightTimer);
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      midnightTimer = setTimeout(() => { void refresh(); }, midnight.getTime() - now.getTime());
      try {
        const token = await tokenStorage.getToken();
        if (!token || await impersonationStorage.isActive() || !active || currentRequest !== request) return;
        const sales = await saleApi.getAll('week');
        const currentToken = await tokenStorage.getToken();
        if (token !== currentToken || await impersonationStorage.isActive() || !active || currentRequest !== request) return;
        if (Date.now() >= midnight.getTime()) {
          void refresh();
          return;
        }
        const today = salesOnDate(sales, localSalesDate(now));
        setSummary(JSON.stringify({
          expiresAt: midnight.getTime(),
          amount: formatCurrency(sumSaleRevenue(today), currency),
          details: `${today.length} ${today.length === 1 ? 'venda' : 'vendas'}`,
          updated: `Atualizado às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        }));
      } catch {
        // Keep the last successful summary available until it expires.
      }
    };

    void refresh();
    const unsubscribe = subscribeToSalesChanges(() => { void refresh(); });
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') void refresh();
      else clearTimeout(midnightTimer);
    });
    return () => {
      active = false;
      clearTimeout(midnightTimer);
      unsubscribe();
      appState.remove();
    };
  }, [mode, sessionKey, currency, loadingCurrency]);
}
