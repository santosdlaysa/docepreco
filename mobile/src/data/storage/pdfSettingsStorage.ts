import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@docepreco_pdf_settings';

export interface PdfSettings {
  logoBase64?: string;
  brandColor: string;
  companySlogan?: string;
  hideWatermark: boolean;
}

const DEFAULT_SETTINGS: PdfSettings = {
  brandColor: '#E91E63',
  hideWatermark: false,
};

export const pdfSettingsStorage = {
  get: async (): Promise<PdfSettings> => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  },

  save: async (settings: PdfSettings): Promise<void> => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  },
};
