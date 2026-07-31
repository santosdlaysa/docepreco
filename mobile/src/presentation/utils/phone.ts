/**
 * Máscara e validação de telefone brasileiro.
 * Aceita fixo com DDD (10 dígitos) e celular com DDD (11 dígitos).
 * O campo é opcional — a validação só deve ser aplicada quando preenchido.
 */

/** Só os dígitos, limitados a 11 (DDD + número). */
export const phoneDigits = (v: string): string => String(v ?? '').replace(/\D/g, '').slice(0, 11);

/** Formata progressivamente: (11) 91234-5678 ou (11) 1234-5678. */
export const maskPhone = (v: string): string => {
  const d = phoneDigits(v);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

/** Válido quando tem 10 (fixo) ou 11 (celular) dígitos com DDD. */
export const isValidPhone = (v: string): boolean => {
  const len = phoneDigits(v).length;
  return len === 10 || len === 11;
};
