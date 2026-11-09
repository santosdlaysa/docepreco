import crypto from 'crypto';
import { PoolClient } from 'pg';
import { pool } from '../database/connection';
import { registerSale, SaleRegistrationError } from '../../application/services/registerSale';
import { saleDateInTimezone, validateWhatsAppSale, WhatsAppSaleInput } from '../../domain/services/whatsappSale';
import { parseWhatsAppSale } from './whatsappSaleParser';
import { sendWhatsAppSessionReply } from './whatsappService';

interface Incoming { id: string; from: string; timestamp: string; type: string; text?: { body?: string } }
export interface InboxMessage { id: string; message_id: string; phone: string; body: string; message_at: Date }

export async function enqueueWhatsAppSales(payload: unknown): Promise<void> {
  if (process.env.WHATSAPP_SALES_ENABLED !== 'true') return;
  const entries = (payload as { entry?: Array<{ changes?: Array<{ value?: { metadata?: { phone_number_id?: string }; messages?: Incoming[] } }> }> })?.entry;
  if (!Array.isArray(entries)) return;
  for (const entry of entries) for (const change of entry.changes ?? []) {
    if (change.value?.metadata?.phone_number_id !== process.env.META_WHATSAPP_PHONE_NUMBER_ID?.trim()) continue;
    for (const message of change.value?.messages ?? []) {
      if (typeof message.id !== 'string' || message.id.length > 255 || !/^[1-9]\d{9,14}$/.test(message.from)) continue;
      const timestamp = Number(message.timestamp) * 1000;
      if (!Number.isFinite(timestamp) || timestamp > Date.now() + 60000 || timestamp < Date.now() - 23 * 3600000) continue;
      const body = message.type === 'text' && typeof message.text?.body === 'string' ? message.text.body.slice(0, 4001) : '';
      await pool.query(`INSERT INTO whatsapp_sale_inbox(message_id,phone,body,message_at) VALUES($1,$2,$3,$4)
        ON CONFLICT(message_id) DO NOTHING`, [message.id, message.from, body, new Date(timestamp)]);
    }
  }
}

const HELP = 'Envie uma venda por mensagem, por exemplo: Vendi 10 brownies a R$ 8 cada, pago no Pix. Revise o resumo e confirme com o código informado. Use corrigir ou cancelar para o rascunho atual. Apenas texto e vendas já pagas nesta versão.';

export async function handleWhatsAppSale(client: PoolClient, message: InboxMessage): Promise<string> {
  const text = message.body.trim();
  const command = text.toLowerCase();
  if (text.length > 4000) return 'Envie uma mensagem de até 4000 caracteres, com uma venda por vez.';
  if (!text) return 'Nesta versão, envie sua venda por texto. Áudios e imagens ainda não são interpretados.';
  const linkMatch = text.match(/^vincular\s+([a-f0-9]{24})$/i);
  if (linkMatch) {
    const hash = crypto.createHash('sha256').update(linkMatch[1].toUpperCase()).digest('hex');
    const codes = await client.query('SELECT * FROM whatsapp_link_codes WHERE code_hash=$1 AND phone=$2 AND expires_at>NOW() FOR UPDATE', [hash, message.phone]);
    const code = codes.rows[0];
    if (!code) return 'Código inválido ou expirado, ou telefone diferente. Gere outro no aplicativo em Perfil → Vendas pelo WhatsApp.';
    const linked = await client.query(`INSERT INTO whatsapp_sale_links(user_id,phone) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING user_id`, [code.user_id, message.phone]);
    if (!linked.rows.length) return 'Este telefone ou conta já está vinculado. Desvincule pelo aplicativo antes de tentar novamente.';
    await client.query('DELETE FROM whatsapp_link_codes WHERE user_id=$1', [code.user_id]);
    return 'WhatsApp vinculado à sua conta do DocePreço! ' + HELP;
  }
  const links = await client.query('SELECT user_id, linked_at FROM whatsapp_sale_links WHERE phone=$1', [message.phone]);
  const link = links.rows[0];
  if (!link) return 'Vincule este telefone no aplicativo em Perfil → Vendas pelo WhatsApp para começar.';
  if (new Date(message.message_at).getTime() + 1000 < new Date(link.linked_at).getTime()) return 'Esta mensagem é anterior ao vínculo atual. Envie a venda novamente.';
  if (['ajuda', 'oi', 'olá', 'ola', 'menu'].includes(command)) return HELP;
  if (command === 'cancelar') {
    await client.query('DELETE FROM whatsapp_sale_drafts WHERE phone=$1', [message.phone]);
    return 'Rascunho cancelado. Nenhuma nova venda foi registrada.';
  }
  const drafts = await client.query('SELECT * FROM whatsapp_sale_drafts WHERE phone=$1 AND user_id=$2 AND expires_at>NOW()', [message.phone, link.user_id]);
  const draft = drafts.rows[0];
  if (/^confirmar(?:\s|$)/.test(command)) {
    if (!draft) return 'Você não tem um rascunho válido. Envie os dados da venda primeiro.';
    if (!draft.confirmation_code || command !== `confirmar ${draft.confirmation_code.toLowerCase()}`) return 'Para confirmar o resumo mais recente, envie exatamente: confirmar ' + (draft.confirmation_code || '(solicite um novo resumo após corrigir os dados)');
    const recipes = await client.query('SELECT id,name FROM recipes WHERE user_id=$1', [link.user_id]);
    const validated = validateWhatsAppSale(draft.data, recipes.rows);
    if ('question' in validated) return validated.question;
    try {
      const sale = await registerSale(link.user_id, validated.data, client, message.message_id);
      await client.query('DELETE FROM whatsapp_sale_drafts WHERE phone=$1', [message.phone]);
      return `Venda registrada no aplicativo! ${validated.data.quantitySold} × ${validated.data.productName}. Total: ${validated.total.toFixed(2)}. Registro: ${sale.id}.`;
    } catch (error) {
      if (error instanceof SaleRegistrationError) return error.message + ' O rascunho foi mantido; nenhuma venda foi registrada.';
      throw error;
    }
  }
  if (command === 'corrigir') {
    if (!draft) return 'Envie os dados da venda para criar um rascunho.';
    await client.query('UPDATE whatsapp_sale_drafts SET confirmation_code=NULL WHERE phone=$1', [message.phone]);
    return 'Informe o que deseja corrigir, por exemplo: a quantidade correta é 12. Depois confira o novo resumo.';
  }
  const rate = await client.query(`SELECT COUNT(*)::int AS count FROM whatsapp_sale_inbox
    WHERE phone=$1 AND received_at>NOW()-INTERVAL '1 hour'`, [message.phone]);
  if (rate.rows[0].count > 30) return 'Limite de mensagens para análise atingido. Aguarde uma hora. Você pode continuar registrando vendas pelo aplicativo.';
  const today = saleDateInTimezone(new Date(message.message_at), process.env.WHATSAPP_SALES_TIMEZONE || 'America/Manaus');
  let parsed: WhatsAppSaleInput;
  try { parsed = await parseWhatsAppSale(text, draft?.data ?? null, today); }
  catch { return 'A interpretação por IA está indisponível. Nenhuma venda foi registrada. Tente novamente mais tarde ou registre pelo aplicativo.'; }
  const recipes = await client.query('SELECT id,name FROM recipes WHERE user_id=$1', [link.user_id]);
  const validated = validateWhatsAppSale(parsed, recipes.rows);
  const code = 'question' in validated ? null : crypto.randomBytes(3).toString('hex').toUpperCase();
  await client.query(`INSERT INTO whatsapp_sale_drafts(phone,user_id,data,confirmation_code,expires_at) VALUES($1,$2,$3::jsonb,$4,NOW()+INTERVAL '2 hours')
    ON CONFLICT(phone) DO UPDATE SET data=$3::jsonb,confirmation_code=$4,expires_at=NOW()+INTERVAL '2 hours'`, [message.phone, link.user_id, JSON.stringify(parsed), code]);
  if ('question' in validated) return validated.question + '\nResponda para completar o rascunho, ou envie cancelar.';
  const prefs = await client.query('SELECT preferences FROM users WHERE id=$1', [link.user_id]);
  const currency = String(prefs.rows[0]?.preferences?.currency || 'BRL');
  return `Confira antes de registrar:\nProduto: ${validated.data.productName}${validated.data.recipeId ? '' : ' (sem receita vinculada)'}\nQuantidade: ${validated.data.quantitySold}\nPreço por unidade: ${currency} ${validated.data.salePrice.toFixed(2)}\nTotal: ${currency} ${validated.total.toFixed(2)}\nData: ${validated.data.saleDate}\nPagamento: ${validated.data.paymentMethod}\nCliente: ${validated.data.clientName || 'não informado'}\n\nEnvie confirmar ${code}, corrigir ou cancelar. Este resumo expira em 2 horas.`;
}

/** Durable inbox: webhook returns after enqueue; all sale state changes share one transaction. */
export async function processWhatsAppSalesOnce(): Promise<void> {
  const client = await pool.connect();
  let currentId: string | undefined;
  try {
    await client.query('BEGIN');
    const pending = await client.query(`SELECT * FROM whatsapp_sale_inbox i WHERE processed_at IS NULL AND attempts<5 AND retry_at<=NOW()
      AND NOT EXISTS (SELECT 1 FROM whatsapp_sale_inbox older WHERE older.phone=i.phone AND older.id<i.id AND older.processed_at IS NULL AND older.attempts<5)
      ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED`);
    const message = pending.rows[0] as InboxMessage | undefined;
    if (!message) { await client.query('COMMIT'); return; }
    currentId = message.id;
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [message.phone]);
    const reply = Date.now() - new Date(message.message_at).getTime() > 23 * 3600000 ? null : await handleWhatsAppSale(client, message);
    await client.query('UPDATE whatsapp_sale_inbox SET processed_at=NOW(),reply=$2,body=\'\',attempts=attempts+1 WHERE id=$1', [message.id, reply]);
    await client.query('COMMIT');
  } catch {
    await client.query('ROLLBACK');
    if (currentId) await client.query(`UPDATE whatsapp_sale_inbox SET attempts=attempts+1,retry_at=NOW()+INTERVAL '1 minute' WHERE id=$1`, [currentId]);
    console.error('[WhatsApp sales] Falha ao processar mensagem; será tentada novamente.');
  } finally { client.release(); }
}

export async function deliverWhatsAppSaleReplyOnce(): Promise<void> {
  const client = await pool.connect();
  let currentId: string | undefined;
  try {
    await client.query('BEGIN');
    const pending = await client.query(`SELECT * FROM whatsapp_sale_inbox i WHERE processed_at IS NOT NULL AND sent_at IS NULL
      AND reply IS NOT NULL AND send_attempts<5 AND retry_at<=NOW() AND message_at>NOW()-INTERVAL '23 hours'
      AND NOT EXISTS (SELECT 1 FROM whatsapp_sale_inbox older WHERE older.phone=i.phone AND older.id<i.id
        AND older.processed_at IS NOT NULL AND older.sent_at IS NULL AND older.reply IS NOT NULL AND older.send_attempts<5
        AND older.message_at>NOW()-INTERVAL '23 hours')
      ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED`);
    const message = pending.rows[0];
    if (message) {
      currentId = message.id;
      await sendWhatsAppSessionReply(message.phone, message.reply, new Date(message.message_at));
      await client.query('UPDATE whatsapp_sale_inbox SET sent_at=NOW(),reply=NULL WHERE id=$1', [message.id]);
    }
    await client.query('COMMIT');
  } catch {
    await client.query('ROLLBACK');
    if (currentId) await client.query(`UPDATE whatsapp_sale_inbox SET send_attempts=send_attempts+1,retry_at=NOW()+INTERVAL '1 minute' WHERE id=$1`, [currentId]);
    console.error('[WhatsApp sales] Falha ao responder; será tentada novamente.');
  } finally { client.release(); }
}

export function startWhatsAppSalesWorker(): void {
  let busy = false;
  let lastCleanup = 0;
  const tick = async () => {
    if (busy || process.env.WHATSAPP_SALES_ENABLED !== 'true') return;
    busy = true;
    try {
      await processWhatsAppSalesOnce(); await deliverWhatsAppSaleReplyOnce();
      if (Date.now() - lastCleanup > 3600000) {
        await pool.query("DELETE FROM whatsapp_sale_inbox WHERE received_at<NOW()-INTERVAL '7 days'");
        await pool.query('DELETE FROM whatsapp_sale_drafts WHERE expires_at<NOW()');
        await pool.query('DELETE FROM whatsapp_link_codes WHERE expires_at<NOW()');
        lastCleanup = Date.now();
      }
    }
    catch { console.error('[WhatsApp sales] Fila indisponível.'); }
    finally { busy = false; }
  };
  const timer = setInterval(() => { void tick(); }, 3000);
  timer.unref();
}
