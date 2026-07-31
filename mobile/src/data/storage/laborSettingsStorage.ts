import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@docepreco_labor_settings';

export interface LaborSettings {
  /** Custo por hora padrão do usuário (string no formato do input, ex.: "25,00"). */
  hourlyRate: string;
  /** Assistente: quanto o usuário quer receber por mês (ex.: "2.000,00"). */
  monthlyIncome?: string;
  /** Assistente: horas trabalhadas por dia (ex.: "6"). */
  hoursPerDay?: string;
  /** Assistente: dias trabalhados por semana (ex.: "5"). */
  daysPerWeek?: string;
}

const DEFAULT_SETTINGS: LaborSettings = {
  hourlyRate: '',
  monthlyIncome: '',
  hoursPerDay: '',
  daysPerWeek: '',
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
