import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const USAGE_KEY = '@docepreco:usageMs';
const ASKED_KEY = '@docepreco:reviewAsked';

// Tempo total de uso necessário antes de pedir avaliação (5 minutos)
const REQUIRED_USAGE_MS = 5 * 60 * 1000;

let sessionStart: number | null = null;
let checkTimer: ReturnType<typeof setTimeout> | null = null;

async function getAccumulatedUsage(): Promise<number> {
  const stored = await AsyncStorage.getItem(USAGE_KEY);
  return stored ? Number(stored) || 0 : 0;
}

async function saveAccumulatedUsage(ms: number): Promise<void> {
  await AsyncStorage.setItem(USAGE_KEY, String(ms));
}

async function alreadyAsked(): Promise<boolean> {
  const v = await AsyncStorage.getItem(ASKED_KEY);
  return v === '1';
}

async function markAsAsked(): Promise<void> {
  await AsyncStorage.setItem(ASKED_KEY, '1');
}

/**
 * Tenta pedir a avaliação nativa da loja.
 * Só dispara se o usuário já tiver usado o app por pelo menos 5 min acumulados
 * e se nunca tiver sido pedido antes. Uma vez mostrado o popup, nunca mais pede.
 */
export async function maybeRequestReview(): Promise<void> {
  try {
    if (await alreadyAsked()) return;

    const usage = await getAccumulatedUsage();
    if (usage < REQUIRED_USAGE_MS) return;

    const available = await StoreReview.isAvailableAsync();
    if (!available) return;

    const hasAction = await StoreReview.hasAction();
    if (!hasAction) return;

    await StoreReview.requestReview();
    await markAsAsked();
  } catch {
    // silencioso — nunca quebrar o app por causa disso
  }
}

/**
 * Inicia o tracking de tempo de uso da sessão atual.
 * Chame ao montar o App.
 */
export function startUsageTracking(): void {
  if (sessionStart !== null) return;
  sessionStart = Date.now();

  // Agenda uma checagem para quando (provavelmente) completar 5 min nesta sessão
  void (async () => {
    // Se já foi pedido, não precisa agendar nada
    if (await alreadyAsked()) return;

    const current = await getAccumulatedUsage();
    const remaining = Math.max(REQUIRED_USAGE_MS - current, 0);
    if (checkTimer) clearTimeout(checkTimer);
    checkTimer = setTimeout(async () => {
      await flushUsage();
      await maybeRequestReview();
    }, remaining + 1000);
  })();
}

/**
 * Salva o tempo acumulado desta sessão no AsyncStorage.
 * Chame ao desmontar o App ou quando o app for para background.
 */
export async function flushUsage(): Promise<void> {
  if (sessionStart === null) return;
  const elapsed = Date.now() - sessionStart;
  sessionStart = Date.now(); // reseta para não contar duas vezes
  const current = await getAccumulatedUsage();
  await saveAccumulatedUsage(current + elapsed);
}

/**
 * Para o tracking da sessão atual.
 */
export function stopUsageTracking(): void {
  if (checkTimer) {
    clearTimeout(checkTimer);
    checkTimer = null;
  }
  sessionStart = null;
}
