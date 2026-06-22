const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'docepreco-evo-secret-key';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'docepreco';

class EvolutionApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'EvolutionApiError';
  }
}

class EvolutionTimeoutError extends Error {
  constructor() {
    super('Evolution API timeout');
    this.name = 'EvolutionTimeoutError';
  }
}

async function evoFetch(path: string, body?: unknown, timeoutMs = 60_000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${EVOLUTION_API_URL}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        apikey: EVOLUTION_API_KEY,
      },
      signal: controller.signal,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const json = await res.json().catch(() => ({})) as Record<string, unknown>;
    if (!res.ok) {
      const message = typeof json.message === 'string'
        ? json.message
        : `Evolution API error: ${res.status}`;
      throw new EvolutionApiError(message, res.status);
    }
    return json;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new EvolutionTimeoutError();
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A Evolution hospedada pode estar em cold start. A primeira requisicao acorda o
 * servico, entao fazemos uma unica nova tentativa em vez de devolver erro ao painel.
 */
async function evoFetchWithColdStartRetry(path: string, body?: unknown): Promise<any> {
  try {
    return await evoFetch(path, body);
  } catch (err: unknown) {
    if (!(err instanceof EvolutionTimeoutError)) throw err;
  }

  try {
    return await evoFetch(path, body, 30_000);
  } catch (err: unknown) {
    if (err instanceof EvolutionTimeoutError) {
      throw new Error('Evolution API indisponível após duas tentativas. Verifique o serviço e tente novamente.');
    }
    throw err;
  }
}

let instanceVerified = false;

async function ensureInstance(): Promise<void> {
  if (instanceVerified) return;
  try {
    await evoFetchWithColdStartRetry(`/instance/connectionState/${EVOLUTION_INSTANCE}`);
    instanceVerified = true;
  } catch (err: unknown) {
    // Somente 404 significa que a instancia nao existe. Timeout, autenticacao e
    // falhas de rede nao devem disparar uma tentativa incorreta de criacao.
    if (!(err instanceof EvolutionApiError) || err.status !== 404) throw err;
    await evoFetchWithColdStartRetry('/instance/create', {
      instanceName: EVOLUTION_INSTANCE,
      qrcode: true,
    });
    instanceVerified = true;
  }
}

export async function createInstance(): Promise<unknown> {
  return evoFetch('/instance/create', {
    instanceName: EVOLUTION_INSTANCE,
    qrcode: true,
  });
}

export async function getQrCode(): Promise<{ base64: string; code: string }> {
  await ensureInstance();
  return evoFetch(`/instance/connect/${EVOLUTION_INSTANCE}`);
}

export async function getInstanceStatus(): Promise<{ state: string }> {
  await ensureInstance();
  const res = await evoFetch(`/instance/connectionState/${EVOLUTION_INSTANCE}`);
  return { state: (res.instance as Record<string, unknown>)?.state as string ?? res.state as string ?? 'unknown' };
}

export async function sendWhatsAppMessage(phone: string, message: string): Promise<unknown> {
  await ensureInstance();
  let cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone.startsWith('55')) cleanPhone = `55${cleanPhone}`;
  return evoFetchWithColdStartRetry(`/message/sendText/${EVOLUTION_INSTANCE}`, {
    number: cleanPhone,
    textMessage: { text: message },
  });
}

/** Pinga a Evolution API para mantê-la acordada no Render */
export async function warmUpEvolutionApi(): Promise<void> {
  try {
    await fetch(`${EVOLUTION_API_URL}`, { method: 'GET', signal: AbortSignal.timeout(10_000) });
    console.log('[EvolutionAPI] warm-up ping ok');
  } catch {
    console.log('[EvolutionAPI] warm-up ping falhou (serviço pode estar iniciando)');
  }
}
