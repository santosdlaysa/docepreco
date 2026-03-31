import AsyncStorage from '@react-native-async-storage/async-storage';

const DEMO_KEY = '@sweet_pricing_demo';

let _isDemoMode = false;

export const isDemoMode = (): boolean => _isDemoMode;

export const setDemoMode = async (value: boolean): Promise<void> => {
  _isDemoMode = value;
  if (value) {
    await AsyncStorage.setItem(DEMO_KEY, 'true');
  } else {
    await AsyncStorage.removeItem(DEMO_KEY);
  }
};

export const loadDemoMode = async (): Promise<boolean> => {
  const value = await AsyncStorage.getItem(DEMO_KEY);
  _isDemoMode = value === 'true';
  return _isDemoMode;
};
