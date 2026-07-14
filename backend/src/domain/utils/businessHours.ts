export interface DayHours {
  dayOfWeek: number; // 0 = domingo ... 6 = sábado
  closed: boolean;
  openTime: string;  // "HH:mm"
  closeTime: string; // "HH:mm"
}

function getSaoPauloNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

/** Sem horário cadastrado, considera sempre aberta (comportamento atual, sem regressão). */
export function isWithinBusinessHours(hours: DayHours[] | null | undefined): boolean {
  if (!hours || hours.length === 0) return true;
  const now = getSaoPauloNow();
  const today = hours.find(h => h.dayOfWeek === now.getDay());
  if (!today || today.closed) return false;

  const [openH, openM] = today.openTime.split(':').map(Number);
  const [closeH, closeM] = today.closeTime.split(':').map(Number);
  if ([openH, openM, closeH, closeM].some(Number.isNaN)) return true;

  const minutes = now.getHours() * 60 + now.getMinutes();
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;
  // Horário que vira a noite (ex: 18:00–02:00) — fora desse caso é um intervalo comum no mesmo dia.
  return closeMin > openMin ? minutes >= openMin && minutes < closeMin : minutes >= openMin || minutes < closeMin;
}

/** Efetivamente aberta agora: ativa, recebendo pedidos (toggle manual) e, se usar horário automático, dentro do horário cadastrado. */
export function isStoreOpenNow(row: { active: boolean; accepting_orders?: boolean | null; use_business_hours: boolean; business_hours: DayHours[] | null }): boolean {
  if (!row.active) return false;
  if (row.accepting_orders === false) return false;
  if (!row.use_business_hours) return true;
  return isWithinBusinessHours(row.business_hours);
}
