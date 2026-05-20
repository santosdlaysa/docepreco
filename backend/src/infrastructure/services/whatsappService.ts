const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'docepreco-evo-secret-key';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'docepreco';

const EVO_TIMEOUT_MS = 30_000; // 30s — cobre cold start do Render

async function evoFetch(path: string, body?: unknown): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EVO_TIMEOUT_MS);
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
    if (!res.ok) throw new Error((json.message as string) ?? `Evolution API error: ${res.status}`);
    return json;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Evolution API timeout — o serviço pode estar iniciando. Tente novamente em alguns segundos.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

let instanceVerified = false;

async function ensureInstance(): Promise<void> {
  if (instanceVerified) return;
  try {
    await evoFetch(`/instance/connectionState/${EVOLUTION_INSTANCE}`);
    instanceVerified = true;
  } catch {
    await evoFetch('/instance/create', {
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
  const cleanPhone = phone.replace(/\D/g, '');
  return evoFetch(`/message/sendText/${EVOLUTION_INSTANCE}`, {
    number: cleanPhone,
    textMessage: { text: message },
  });
}
