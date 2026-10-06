/**
 * Unidades de medida — métricas e imperiais (oz, lb, fl oz, xícara, colheres),
 * iguais às do app. Fatores no padrão US, os mesmos do backend
 * (backend/src/domain/services/recipeCalculator.ts → convertUnit).
 */
import i18n from '../i18n';

export type UnitSystem = 'metric' | 'imperial';

const MASS_TO_G: Record<string, number> = { g: 1, kg: 1000, oz: 28.349523125, lb: 453.59237 };
const VOLUME_TO_ML: Record<string, number> = {
  ml: 1, l: 1000, tsp: 4.92892159375, tbsp: 14.78676478125, fl_oz: 29.5735295625, cup: 236.5882365,
};

export const UNIT_SHORT: Record<string, string> = {
  unit: 'un', g: 'g', kg: 'kg', ml: 'ml', l: 'l',
  oz: 'oz', lb: 'lb', fl_oz: 'fl oz', cup: 'xícara (cup)', tbsp: 'colher de sopa (tbsp)', tsp: 'colher de chá (tsp)',
};

export const UNIT_SYSTEM_OPTIONS: Record<UnitSystem, string[]> = {
  metric: ['unit', 'g', 'kg', 'ml', 'l'],
  imperial: ['unit', 'oz', 'lb', 'fl_oz', 'cup', 'tbsp', 'tsp'],
};

/** Rótulo curto de uma unidade ('unit' → 'un'), no idioma atual. */
export const unitLabel = (unit: string): string => i18n.t(`ops:unit.${unit}`, { defaultValue: UNIT_SHORT[unit] ?? unit });

/** Converte entre unidades da mesma família; null se incompatíveis. */
export function convertUnitOrNull(qty: number, from: string, to: string): number | null {
  if (from === to) return qty;
  for (const table of [MASS_TO_G, VOLUME_TO_ML]) {
    if (table[from] !== undefined && table[to] !== undefined) return qty * table[from] / table[to];
  }
  return null;
}

/** Unidades da mesma família (para escolher como usar um ingrediente na receita). */
export function sameFamilyUnits(unit: string): string[] {
  for (const table of [MASS_TO_G, VOLUME_TO_ML]) {
    if (table[unit] !== undefined) return Object.keys(table);
  }
  return [unit];
}

const SYSTEM_KEY = 'docepreco_unit_system';

export function getUnitSystem(): UnitSystem {
  try {
    return localStorage.getItem(SYSTEM_KEY) === 'imperial' ? 'imperial' : 'metric';
  } catch {
    return 'metric';
  }
}

export function setUnitSystem(s: UnitSystem): void {
  try { localStorage.setItem(SYSTEM_KEY, s); } catch { /* ignora */ }
}

/** Opções do seletor de unidade: as do sistema escolhido + a atual (se for de outro sistema). */
export function unitOptions(current?: string): { value: string; label: string }[] {
  const list = [...UNIT_SYSTEM_OPTIONS[getUnitSystem()]];
  if (current && !list.includes(current)) list.push(current);
  return list.map(value => ({ value, label: unitLabel(value) }));
}
