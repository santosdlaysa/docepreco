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
    console.log(`[EvolutionAPI] ${body ? 'POST' : 'GET'} ${path}`);
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
      console.error(`[EvolutionAPI] Error ${res.status}: ${message}`);
      throw new EvolutionApiError(message, res.status);
    }
    return json;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('[EvolutionAPI] Request timeout');
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
    console.log(`[WhatsApp] Verificando instância ${EVOLUTION_INSTANCE}`);
    await evoFetchWithColdStartRetry(`/instance/connectionState/${EVOLUTION_INSTANCE}`);
    instanceVerified = true;
    console.log(`[WhatsApp] Instância verificada com sucesso`);
  } catch (err: unknown) {
    // Somente 404 significa que a instancia nao existe. Timeout, autenticacao e
    // falhas de rede nao devem disparar uma tentativa incorreta de criacao.
    if (!(err instanceof EvolutionApiError) || err.status !== 404) {
      console.error(`[WhatsApp] Erro ao verificar instância:`, err);
      throw err;
    }
    try {
      console.log(`[WhatsApp] Criando nova instância ${EVOLUTION_INSTANCE}`);
      await evoFetchWithColdStartRetry('/instance/create', {
        instanceName: EVOLUTION_INSTANCE,
        qrcode: true,
      });
      instanceVerified = true;
      console.log(`[WhatsApp] Instância criada com sucesso`);
    } catch (createErr) {
      console.error(`[WhatsApp] Erro ao criar instância:`, createErr);
      throw createErr;
    }
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
  console.log(`[WhatsApp] Tentando enviar mensagem para ${phone}`);

  await ensureInstance();
  let cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone.startsWith('55')) cleanPhone = `55${cleanPhone}`;

  // Validação: número brasileiro deve ter 10-11 dígitos após o 55
  const digitsAfter55 = cleanPhone.replace(/^55/, '');
  if (digitsAfter55.length < 10 || digitsAfter55.length > 11) {
    const error = `Número de telefone inválido: ${phone} (após limpeza: 55${digitsAfter55}). Deve ter 10-11 dígitos.`;
    console.error(`[WhatsApp] ${error}`);
    throw new Error(error);
  }

  console.log(`[WhatsApp] Número validado: ${cleanPhone}`);

  try {
    const result = await evoFetchWithColdStartRetry(`/message/sendText/${EVOLUTION_INSTANCE}`, {
      number: cleanPhone,
      textMessage: { text: message },
    });
    console.log(`[WhatsApp] Mensagem enviada com sucesso para ${cleanPhone}`);
    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[WhatsApp] Erro ao enviar: ${errorMsg}`);
    if (errorMsg.includes('Evolution API') || errorMsg.includes('indisponível')) {
      throw new Error(`Evolution API indisponível: ${errorMsg}`);
    }
    throw err;
  }
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
