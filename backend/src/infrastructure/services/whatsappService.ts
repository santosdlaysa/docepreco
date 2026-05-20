const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'docepreco-evo-secret-key';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'docepreco';

async function evoFetch(path: string, body?: unknown): Promise<any> {
  const res = await fetch(`${EVOLUTION_API_URL}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      apikey: EVOLUTION_API_KEY,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({})) as Record<string, unknown>;
  if (!res.ok) throw new Error((json.message as string) ?? `Evolution API error: ${res.status}`);
  return json;
}

export async function createInstance(): Promise<unknown> {
  return evoFetch('/instance/create', {
    instanceName: EVOLUTION_INSTANCE,
    integration: 'WHATSAPP-BAILEYS',
    qrcode: true,
  });
}

export async function getQrCode(): Promise<{ base64: string; code: string }> {
  return evoFetch(`/instance/connect/${EVOLUTION_INSTANCE}`);
}

export async function getInstanceStatus(): Promise<{ state: string }> {
  const res: any = await evoFetch(`/instance/connectionState/${EVOLUTION_INSTANCE}`);
  return { state: res.state ?? res.instance?.state ?? 'unknown' };
}

export async function sendWhatsAppMessage(phone: string, message: string): Promise<unknown> {
  const cleanPhone = phone.replace(/\D/g, '');
  return evoFetch(`/message/sendText/${EVOLUTION_INSTANCE}`, {
    number: cleanPhone,
    text: message,
  });
}
