import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';
import './src/i18n';
import { AppNavigator } from './src/presentation/navigation/AppNavigator';
import { ToastProvider } from './src/presentation/context/ToastContext';
import { PremiumProvider } from './src/presentation/context/PremiumContext';
import { CurrencyProvider } from './src/context/CurrencyContext';
import {
  flushUsage,
  startUsageTracking,
  stopUsageTracking,
} from './src/presentation/utils/review';
import { initializeNotifications, onAppForeground } from './src/presentation/utils/notifications';
import { configureRevenueCat } from './src/data/premium/revenueCat';
import { initUxCam } from './src/presentation/utils/uxcam';

configureRevenueCat();

initUxCam();

function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  const appState = useRef<AppStateStatus>(AppState.currentState);

  const checkForUpdate = async () => {
    if (__DEV__) return;
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      }
    } catch {
      // silencioso
    }
  };

  useEffect(() => {
    startUsageTracking();
    void initializeNotifications();
    void checkForUpdate();

    const sub = AppState.addEventListener('change', (next) => {
      const prev = appState.current;
      if (prev === 'active' && next.match(/inactive|background/)) {
        // saindo do foco: persiste o tempo usado até agora
        void flushUsage();
        stopUsageTracking();
      } else if (next === 'active' && prev.match(/inactive|background/)) {
        // voltando ao foco: reinicia o tracking e reagenda notificacoes
        startUsageTracking();
        void onAppForeground();
        void checkForUpdate();
      }
      appState.current = next;
    });

    return () => {
      void flushUsage();
      stopUsageTracking();
      sub.remove();
    };
  }, []);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#FFF0F3' }} />;
  }

  return (
    <SafeAreaProvider>
      <CurrencyProvider>
        <PremiumProvider>
          <ToastProvider>
            <StatusBar style="dark" backgroundColor="#FFF0F3" />
            <AppNavigator />
          </ToastProvider>
        </PremiumProvider>
      </CurrencyProvider>
    </SafeAreaProvider>
  );
}

export default App;
