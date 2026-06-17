import { Unit } from '../../domain/entities/Ingredient';
import { UnitSystem } from '../../context/UnitSystemContext';

export const UNIT_LABELS: Record<Unit, string> = {
  unit: 'un',
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'L',
  oz: 'oz',
  lb: 'lb',
  fl_oz: 'fl oz',
  cup: 'cup',
  tbsp: 'tbsp',
  tsp: 'tsp',
};

export const UNIT_SYSTEM_OPTIONS: Record<UnitSystem, Unit[]> = {
  metric: ['unit', 'g', 'kg', 'ml', 'l'],
  imperial: ['unit', 'oz', 'lb', 'fl_oz', 'cup', 'tbsp', 'tsp'],
};

export const getUnitOptions = (unitSystem: UnitSystem): { value: Unit; label: string }[] => {
  return UNIT_SYSTEM_OPTIONS[unitSystem].map(value => ({ value, label: UNIT_LABELS[value] }));
};

export const formatUnitLabel = (unit: string): string => {
  return UNIT_LABELS[unit as Unit] ?? unit;
};
