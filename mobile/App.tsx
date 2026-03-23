import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/presentation/navigation/AppNavigator';
import { ToastProvider } from './src/presentation/context/ToastContext';

export default function App() {
  return (
    <ToastProvider>
      <StatusBar style="dark" backgroundColor="#FFF0F3" />
      <AppNavigator />
    </ToastProvider>
  );
}
