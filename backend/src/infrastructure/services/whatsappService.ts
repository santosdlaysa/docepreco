import { pool } from '../database/connection';

const META_GRAPH_BASE_URL = 'https://graph.facebook.com';

export class WhatsAppCloudApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'WhatsAppCloudApiError';
  }
}

type TemplateMessage = { name: string; languageCode?: string; bodyParameters?: string[] };

function getConfig() {
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID?.trim();
  return {
    accessToken, phoneNumberId,
    graphVersion: process.env.META_GRAPH_API_VERSION?.trim() || 'v24.0',
    configured: Boolean(accessToken && phoneNumberId),
  };
}

function requireConfig() {
  const config = getConfig();
  if (!config.configured) {
    throw new WhatsAppCloudApiError('WhatsApp Cloud API não configurada. Defina META_WHATSAPP_ACCESS_TOKEN e META_WHATSAPP_PHONE_NUMBER_ID.', 503);
  }
  return config as typeof config & { accessToken: string; phoneNumberId: string };
}

function normalizeBrazilianPhone(phone: string): string {
  let normalized = phone.replace(/\D/g, '');
  if (!normalized.startsWith('55')) normalized = `55${normalized}`;
  if (normalized.slice(2).length < 10 || normalized.slice(2).length > 11) {
    throw new WhatsAppCloudApiError('Número de telefone brasileiro inválido.', 400);
  }
  return normalized;
}

async function cloudFetch(path: string, body: unknown): Promise<Record<string, unknown>> {
  const config = requireConfig();
  const response = await fetch(`${META_GRAPH_BASE_URL}/${config.graphVersion}/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(30_000),
  });
  const json = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const error = json.error as { message?: string; error_user_msg?: string } | undefined;
    throw new WhatsAppCloudApiError(error?.error_user_msg ?? error?.message ?? `Meta Graph API error: ${response.status}`, response.status);
  }
  return json;
}

async function saveMessageStatus(providerMessageId: string, phone: string | null, status: string, payload: unknown): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO whatsapp_messages (provider_message_id, recipient_phone, status, payload, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, NOW())
       ON CONFLICT (provider_message_id) DO UPDATE
       SET recipient_phone = COALESCE(EXCLUDED.recipient_phone, whatsapp_messages.recipient_phone),
           status = EXCLUDED.status, payload = EXCLUDED.payload, updated_at = NOW()`,
      [providerMessageId, phone, status, JSON.stringify(payload)],
    );
  } catch (error) {
    // A telemetria não pode deixar o webhook da Meta indisponível.
    console.error('[WhatsApp Cloud] Falha ao persistir status:', error);
  }
}

export function getWhatsAppStatus(): { state: 'configured' | 'not_configured'; provider: 'meta-cloud-api' } {
  return { state: getConfig().configured ? 'configured' : 'not_configured', provider: 'meta-cloud-api' };
}

/** Envia somente templates aprovados; texto livre é proibido no painel para evitar disparos fora da janela de 24h. */
export async function sendWhatsAppTemplate(phone: string, template: TemplateMessage): Promise<{ id: string; status: 'accepted' }> {
  if (!/^[a-z0-9_]{1,512}$/.test(template.name)) throw new WhatsAppCloudApiError('Nome de template inválido.', 400);
  const to = normalizeBrazilianPhone(phone);
  const config = requireConfig();
  const parameters = (template.bodyParameters ?? []).map((text) => ({ type: 'text', text: String(text) }));
  const result = await cloudFetch(`${config.phoneNumberId}/messages`, {
    messaging_product: 'whatsapp', to, type: 'template',
    template: {
      name: template.name, language: { code: template.languageCode ?? 'pt_BR' },
      ...(parameters.length ? { components: [{ type: 'body', parameters }] } : {}),
    },
  });
  const id = (result.messages as Array<{ id?: string }> | undefined)?.[0]?.id;
  if (!id) throw new WhatsAppCloudApiError('A Meta não retornou o identificador da mensagem.');
  await saveMessageStatus(id, to, 'accepted', result);
  return { id, status: 'accepted' };
}

/** Template de marketing aprovado na Meta, usado somente para contatos com opt-in registrado. */
export async function sendWinbackWhatsAppTemplate(phone: string, values: {
  companyName: string; discountPercent: number; fullPriceLabel: string; discountedPriceLabel: string; validUntilLabel: string;
}): Promise<{ id: string; status: 'accepted' }> {
  const templateName = process.env.WHATSAPP_WINBACK_TEMPLATE_NAME?.trim();
  if (!templateName) {
    throw new WhatsAppCloudApiError('WHATSAPP_WINBACK_TEMPLATE_NAME não configurado. A campanha foi bloqueada para evitar envio fora das regras da Meta.', 503);
  }
  return sendWhatsAppTemplate(phone, {
    name: templateName,
    bodyParameters: [values.companyName || 'cliente', String(values.discountPercent), values.fullPriceLabel, values.discountedPriceLabel, values.validUntilLabel],
  });
}

export async function getMessageStatus(id: string): Promise<{ status: string; updatedAt: number } | null> {
  const result = await pool.query('SELECT status, updated_at FROM whatsapp_messages WHERE provider_message_id = $1', [id]).catch(() => ({ rows: [] }));
  const message = result.rows[0];
  return message ? { status: message.status, updatedAt: new Date(message.updated_at).getTime() } : null;
}

/** Processa atualizações de entrega/lida/falha da Cloud API. */
export async function recordMessageUpdate(payload: unknown): Promise<void> {
  type Status = { id?: string; recipient_id?: string; status?: string };
  type Change = { value?: { statuses?: Status[] } };
  const entries = (payload as { entry?: Array<{ changes?: Change[] }> })?.entry ?? [];
  for (const entry of entries) for (const change of entry.changes ?? []) for (const status of change.value?.statuses ?? []) {
    if (status.id && status.status) {
      // Guarda somente o evento de status; não persiste conteúdo de mensagens recebidas.
      await saveMessageStatus(status.id, status.recipient_id ?? null, status.status, {
        id: status.id, recipientId: status.recipient_id ?? null, status: status.status,
      });
    }
  }
}
