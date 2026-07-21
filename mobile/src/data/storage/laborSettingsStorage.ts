import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@docepreco_labor_settings';

export interface LaborSettings {
  /** Custo por hora padrão do usuário (string no formato do input, ex.: "25,00"). */
  hourlyRate: string;
}

const DEFAULT_SETTINGS: LaborSettings = {
  hourlyRate: '',
};

export const laborSettingsStorage = {
  get: async (): Promise<LaborSettings> => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  },

  save: async (settings: LaborSettings): Promise<void> => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  },
};
