/**
 * Normaliza uma data para o formato ISO `YYYY-MM-DD` que o Postgres aceita.
 *
 * Aceita:
 *  - ISO já correto: `2026-07-30` (com ou sem parte de hora)
 *  - Formato brasileiro: `30/07/2026` e `30/07/26` (ano com 2 dígitos → 20xx)
 *
 * Retorna `null` se a string não representar uma data válida — o chamador
 * decide se rejeita a requisição. Motivação: usuários digitam a data à mão no
 * formato BR (dd/mm/aaaa) e o insert cru quebrava com "date/time field value
 * out of range".
 */
export function normalizeDateToISO(input: unknown): string | null {
  if (input == null) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  let y: number, m: number, d: number;

  // ISO: 2026-07-30 (ignora qualquer parte após a data)
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    y = Number(iso[1]); m = Number(iso[2]); d = Number(iso[3]);
  } else {
    // BR: 30/07/2026 ou 30/07/26 (aceita também separador "-" ou ".")
    const br = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
    if (!br) return null;
    d = Number(br[1]); m = Number(br[2]);
    y = Number(br[3]);
    if (y < 100) y += 2000; // 26 → 2026
  }

  // Valida faixas e existência real do dia (evita 31/02, mês 13 etc.)
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 3000) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return null;
  }

  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}
