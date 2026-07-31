/**
 * PIX "Copia e Cola" estático (BR Code / padrão EMV® do Banco Central).
 *
 * Gera o payload que o cliente cola no app do banco para pagar direto na conta
 * do confeiteiro — sem PSP, sem taxa, o DocePreço nunca toca no dinheiro.
 * A confirmação do pagamento é manual (Fase 1): o dono marca o pedido como pago.
 *
 * Referência: Manual do BR Code (Bacen) — TLV `id + tamanho(2) + valor`, com
 * CRC16-CCITT (polinômio 0x1021, init 0xFFFF) nos 4 últimos caracteres.
 */

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

export interface StaticPixParams {
  /** Chave PIX já normalizada (ver normalizePixKey). */
  key: string;
  /** Nome do recebedor (merchant name) — máx. 25 chars no BR Code. */
  merchantName: string;
  /** Cidade do recebedor (merchant city) — máx. 15 chars. */
  merchantCity: string;
  /** Valor da cobrança em reais. Omitido/0 = QR sem valor (cliente digita). */
  amount?: number | null;
  /** Identificador da transação (txid) — alfanumérico, máx. 25 chars. */
  txid?: string | null;
}

/** Monta um campo TLV: id + tamanho (2 dígitos) + valor. */
function emv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/** Remove acentos, mantém só [A-Z0-9 espaço], corta no tamanho e sobe pra maiúsculas. */
function sanitizeText(text: string, maxLen: number): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .slice(0, maxLen)
    .toUpperCase();
}

/** CRC16-CCITT (0x1021, init 0xFFFF) em hex maiúsculo de 4 dígitos. */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Gera o payload "copia e cola" do PIX estático com valor.
 * Point of Initiation = "12" (uso único), pois cada pedido tem valor/txid próprio.
 */
export function buildStaticPixPayload(params: StaticPixParams): string {
  const key = params.key.trim();
  const name = sanitizeText(params.merchantName || 'LOJA', 25) || 'LOJA';
  const city = sanitizeText(params.merchantCity || 'BRASIL', 15) || 'BRASIL';

  let txid = (params.txid || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25);
  if (!txid) txid = '***';

  const merchantAccountInfo = emv('00', 'br.gov.bcb.pix') + emv('01', key);

  let payload = '';
  payload += emv('00', '01');                       // Payload Format Indicator
  payload += emv('01', '12');                       // Point of Initiation — uso único
  payload += emv('26', merchantAccountInfo);        // Merchant Account Information (PIX)
  payload += emv('52', '0000');                     // Merchant Category Code
  payload += emv('53', '986');                      // Moeda — BRL
  if (params.amount != null && params.amount > 0) {
    payload += emv('54', params.amount.toFixed(2)); // Valor da transação
  }
  payload += emv('58', 'BR');                        // País
  payload += emv('59', name);                        // Nome do recebedor
  payload += emv('60', city);                        // Cidade do recebedor
  payload += emv('62', emv('05', txid));            // Additional Data — Reference Label (txid)
  payload += '6304';                                 // CRC16 (id + tamanho); valor calculado abaixo
  payload += crc16(payload);
  return payload;
}

/**
 * Valida e normaliza uma chave PIX conforme o tipo. Retorna a chave no formato
 * que deve ir no BR Code (ex.: telefone em E.164, CPF/CNPJ só dígitos).
 */
export function normalizePixKey(
  type: PixKeyType,
  key: string
): { valid: boolean; normalized?: string; error?: string } {
  const k = (key ?? '').trim();
  if (!k) return { valid: false, error: 'Informe a chave PIX' };

  switch (type) {
    case 'cpf': {
      const d = k.replace(/\D/g, '');
      if (d.length !== 11) return { valid: false, error: 'CPF deve ter 11 dígitos' };
      return { valid: true, normalized: d };
    }
    case 'cnpj': {
      const d = k.replace(/\D/g, '');
      if (d.length !== 14) return { valid: false, error: 'CNPJ deve ter 14 dígitos' };
      return { valid: true, normalized: d };
    }
    case 'phone': {
      const d = k.replace(/\D/g, '');
      if (d.length < 10 || d.length > 11) return { valid: false, error: 'Telefone inválido' };
      return { valid: true, normalized: `+55${d}` };
    }
    case 'email': {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(k)) return { valid: false, error: 'E-mail inválido' };
      if (k.length > 77) return { valid: false, error: 'E-mail muito longo para PIX' };
      return { valid: true, normalized: k.toLowerCase() };
    }
    case 'random': {
      const ok = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(k);
      if (!ok) return { valid: false, error: 'Chave aleatória inválida (formato UUID)' };
      return { valid: true, normalized: k.toLowerCase() };
    }
    default:
      return { valid: false, error: 'Tipo de chave inválido' };
  }
}

export const PIX_KEY_TYPES: PixKeyType[] = ['cpf', 'cnpj', 'email', 'phone', 'random'];
