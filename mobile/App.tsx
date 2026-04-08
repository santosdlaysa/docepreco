import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { AppNavigator } from './src/presentation/navigation/AppNavigator';
import { ToastProvider } from './src/presentation/context/ToastContext';
import {
  flushUsage,
  startUsageTracking,
  stopUsageTracking,
} from './src/presentation/utils/review';

export default function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    startUsageTracking();

    const sub = AppState.addEventListener('change', (next) => {
      const prev = appState.current;
      if (prev === 'active' && next.match(/inactive|background/)) {
        // saindo do foco: persiste o tempo usado até agora
        void flushUsage();
        stopUsageTracking();
      } else if (next === 'active' && prev.match(/inactive|background/)) {
        // voltando ao foco: reinicia o tracking
        startUsageTracking();
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
    <ToastProvider>
      <StatusBar style="dark" backgroundColor="#FFF0F3" />
      <AppNavigator />
    </ToastProvider>
  );
}
