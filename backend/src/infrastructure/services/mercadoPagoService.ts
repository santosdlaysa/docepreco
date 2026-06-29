const MP_BASE_URL = 'https://api.mercadopago.com';

function getAccessToken(): string {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token || token.trim() === '') {
    throw new Error('[MercadoPago] MERCADO_PAGO_ACCESS_TOKEN não configurado');
  }
  return token;
}

export interface MpPixPayment {
  paymentId: string;
  qrCode: string;       // copia-e-cola
  qrCodeBase64: string; // imagem base64 (sem prefixo data:image)
  expiresAt: string;
}

/**
 * Cria um pagamento PIX no Mercado Pago.
 * @param externalReference - ID da pix_request no nosso banco (usado para identificar o webhook)
 */
export async function createMpPixPayment(opts: {
  amountCents: number;
  description: string;
  payerEmail: string;
  externalReference: string;
}): Promise<MpPixPayment> {
  const token = getAccessToken();
  const amount = opts.amountCents / 100;

  // Expira em 24 horas
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const notificationUrl = `${process.env.APP_BASE_URL}/api/pix/webhook/mercadopago`;

  const response = await fetch(`${MP_BASE_URL}/v1/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      transaction_amount: amount,
      description: opts.description,
      payment_method_id: 'pix',
      payer: { email: opts.payerEmail },
      external_reference: opts.externalReference,
      notification_url: notificationUrl,
      date_of_expiration: expiresAt,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`[MercadoPago] Erro ao criar pagamento PIX: ${err}`);
  }

  const data = await response.json() as any;
  const txData = data.point_of_interaction?.transaction_data;

  return {
    paymentId: String(data.id),
    qrCode: txData?.qr_code ?? '',
    qrCodeBase64: txData?.qr_code_base64 ?? '',
    expiresAt,
  };
}

/**
 * Consulta o status de um pagamento no Mercado Pago.
 * Retorna o status ('approved', 'pending', 'rejected', etc.) e o external_reference.
 */
export async function getMpPaymentInfo(paymentId: string): Promise<{ status: string; externalReference: string }> {
  const token = getAccessToken();

  const response = await fetch(`${MP_BASE_URL}/v1/payments/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`[MercadoPago] Erro ao consultar pagamento ${paymentId}: ${err}`);
  }

  const data = await response.json() as any;
  return {
    status: data.status,
    externalReference: data.external_reference ?? '',
  };
}
