export const parseLocaleNumber = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const sanitized = String(value ?? '').trim().replace(/[^0-9,.-]/g, '');
  if (!sanitized) return 0;

  const lastComma = sanitized.lastIndexOf(',');
  const lastDot = sanitized.lastIndexOf('.');
  const decimalSep = lastComma > lastDot ? ',' : lastDot > -1 ? '.' : '';

  let normalized = sanitized;
  if (decimalSep) {
    const thousandsSep = decimalSep === ',' ? '.' : ',';
    normalized = normalized.replace(new RegExp(`\\${thousandsSep}`, 'g'), '');
    if (decimalSep === ',') normalized = normalized.replace(',', '.');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};
