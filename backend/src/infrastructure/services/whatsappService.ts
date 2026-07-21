const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'docepreco-evo-secret-key';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'docepreco';
const EVOLUTION_WEBHOOK_URL = process.env.EVOLUTION_WEBHOOK_URL || 'https://docepreco.onrender.com/api/webhooks/evolution';

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

async function evoFetch(path: string, body?: unknown, timeoutMs = 60_000, method?: 'GET' | 'POST' | 'DELETE'): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    console.log(`[EvolutionAPI] ${body ? 'POST' : 'GET'} ${path}`);
    const res = await fetch(`${EVOLUTION_API_URL}${path}`, {
      method: method ?? (body ? 'POST' : 'GET'),
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
let webhookConfigured = false;
const messageStatuses = new Map<string, { status: string; updatedAt: number }>();

export function recordMessageUpdate(payload: unknown): void {
  type MessageUpdate = { id?: string; remoteJid?: string; key?: { id?: string; remoteJid?: string }; status?: unknown; statusReason?: unknown; error?: unknown; update?: { status?: unknown; error?: unknown } };
  const root = payload as { data?: MessageUpdate; error?: unknown } & MessageUpdate;
  const data = root.data ?? root;
  const id = data.key?.id ?? data.id;
  const rawStatus = data.status ?? data.update?.status;
  if (!id || rawStatus === undefined) return;
  const status = String(rawStatus).toUpperCase();
  const remoteJid = data.key?.remoteJid ?? data.remoteJid ?? 'unknown';
  messageStatuses.set(id, { status, updatedAt: Date.now() });
  const log = `[WhatsApp] Message status: ${status} | id=${id} | remoteJid=${remoteJid}`;
  const detail = data.error ?? data.update?.error ?? data.statusReason ?? root.error;
  if (status === 'ERROR') console.error(detail ? `${log} | detail=${JSON.stringify(detail)}` : log);
  else console.log(log);
}

export function getMessageStatus(id: string): { status: string; updatedAt: number } | null {
  return messageStatuses.get(id) ?? null;
}

async function configureWebhook(): Promise<void> {
  if (webhookConfigured) return;
  try {
    await evoFetch(`/webhook/set/${EVOLUTION_INSTANCE}`, {
      enabled: true,
      url: EVOLUTION_WEBHOOK_URL,
      events: ['MESSAGES_UPDATE', 'SEND_MESSAGE', 'CONNECTION_UPDATE'],
      base64: false,
    });
    webhookConfigured = true;
    console.log(`[WhatsApp] Webhook configurado: ${EVOLUTION_WEBHOOK_URL}`);
  } catch (error) {
    console.error('[WhatsApp] Não foi possível configurar o webhook:', error);
  }
}

// Reset instance state se necessário (força recriação)
export function resetInstanceState(): void {
  instanceVerified = false;
  webhookConfigured = false;
  console.log('[WhatsApp] Instance state resetado - será recriada na próxima requisição');
}

/** Desconecta a sessão atual e deixa a próxima leitura pronta para gerar outro QR. */
export async function resetInstance(): Promise<void> {
  resetInstanceState();
  try {
    await logoutInstance();
  } catch (error) {
    // Depois de um logout/401 a Evolution pode responder erro porque a sessão
    // já foi encerrada. Nesse caso ainda devemos continuar até o connect/QR.
    console.warn('[WhatsApp] Logout anterior não exigiu encerramento adicional:', error);
  }
  try {
    await deleteInstance();
    console.log(`[WhatsApp] Instância ${EVOLUTION_INSTANCE} excluída para limpar a sessão antiga`);
  } catch (error) {
    // A instância pode já ter sido removida pelo monitor da Evolution.
    if (!(error instanceof EvolutionApiError && error.status === 404)) {
      console.warn('[WhatsApp] Não foi possível excluir a instância antiga:', error);
    }
  }
}

async function ensureInstance(): Promise<void> {
  if (instanceVerified) return;
  try {
    console.log(`[WhatsApp] Verificando instância ${EVOLUTION_INSTANCE}`);
    await evoFetchWithColdStartRetry(`/instance/connectionState/${EVOLUTION_INSTANCE}`);
    instanceVerified = true;
    await configureWebhook();
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
      await configureWebhook();
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

export async function logoutInstance(): Promise<unknown> {
  return evoFetch(`/instance/logout/${EVOLUTION_INSTANCE}`, undefined, 60_000, 'DELETE');
}

export async function deleteInstance(): Promise<unknown> {
  return evoFetch(`/instance/delete/${EVOLUTION_INSTANCE}`, undefined, 60_000, 'DELETE');
}

export async function getQrCode(): Promise<{ base64: string; code: string }> {
  await ensureInstance();
  const res = await evoFetch(`/instance/connect/${EVOLUTION_INSTANCE}`) as Record<string, unknown>;
  const nested = (res.qrcode ?? {}) as Record<string, unknown>;
  return {
    base64: String(res.base64 ?? nested.base64 ?? ''),
    code: String(res.code ?? res.pairingCode ?? nested.code ?? ''),
  };
}

export async function getInstanceStatus(): Promise<{ state: string }> {
  await ensureInstance();
  const res = await evoFetch(`/instance/connectionState/${EVOLUTION_INSTANCE}`);
  return { state: (res.instance as Record<string, unknown>)?.state as string ?? res.state as string ?? 'unknown' };
}

export async function sendWhatsAppMessage(phone: string, message: string): Promise<unknown> {
  console.log(`[WhatsApp] Tentando enviar mensagem para ${phone}`);

  await ensureInstance();
  const connection = await getInstanceStatus();
  if (connection.state !== 'open') {
    const error = `WhatsApp não está conectado (estado: ${connection.state}). Reconecte e escaneie um novo QR code antes de enviar.`;
    console.error(`[WhatsApp] ${error}`);
    throw new Error(error);
  }
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
    if (result?.key?.id) {
      messageStatuses.set(result.key.id, { status: String(result.status ?? 'PENDING').toUpperCase(), updatedAt: Date.now() });
    }
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
