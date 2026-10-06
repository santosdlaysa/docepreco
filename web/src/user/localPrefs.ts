/**
 * Preferências guardadas no navegador (mesmo papel do AsyncStorage no app):
 * personalização do PDF, padrões da mão de obra e rascunho de receita nova.
 * Tudo em try/catch: em aba anônima ou com storage bloqueado só não persiste.
 */

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage cheio/bloqueado */ }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch { /* ignore */ }
}

// ── PDF do orçamento (espelha mobile/src/data/storage/pdfSettingsStorage.ts) ──
export interface PdfSettings {
  logoBase64?: string;
  brandColor: string;
  companySlogan?: string;
  hideWatermark: boolean;
}
const PDF_KEY = 'docepreco_pdf_settings';
export const DEFAULT_PDF_SETTINGS: PdfSettings = { brandColor: '#E91E63', hideWatermark: false };
export const PDF_COLORS = [
  { color: '#E91E63', label: 'Rosa' },
  { color: '#E53935', label: 'Vermelho' },
  { color: '#9C27B0', label: 'Roxo' },
  { color: '#2196F3', label: 'Azul' },
  { color: '#4CAF50', label: 'Verde' },
  { color: '#FF9800', label: 'Laranja' },
  { color: '#795548', label: 'Marrom' },
  { color: '#607D8B', label: 'Cinza' },
];
export const getPdfSettings = () => load<PdfSettings>(PDF_KEY, DEFAULT_PDF_SETTINGS);
export const savePdfSettings = (s: PdfSettings) => save(PDF_KEY, s);

// ── Mão de obra (espelha laborSettingsStorage) ──
export interface LaborSettings {
  hourlyRate: string;
  monthlyIncome?: string;
  hoursPerDay?: string;
  daysPerWeek?: string;
}
const LABOR_KEY = 'docepreco_labor_settings';
export const getLaborSettings = () => load<LaborSettings>(LABOR_KEY, { hourlyRate: '', monthlyIncome: '', hoursPerDay: '', daysPerWeek: '' });
export const saveLaborSettings = (s: LaborSettings) => save(LABOR_KEY, s);

// ── Rascunho de receita nova (espelha useDraft('draft_new_recipe')) ──
const DRAFT_KEY = 'docepreco_draft_new_recipe';
export function getRecipeDraft<T>(): T | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
export const saveRecipeDraft = (draft: unknown) => save(DRAFT_KEY, draft);
export const clearRecipeDraft = () => remove(DRAFT_KEY);
