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
      'X-Idempotency-Key': opts.externalReference,
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

// ---------------------------------------------------------------------------
// Assinaturas (preapproval) — renovação automática via Pix Automático.
// O pagador autoriza uma única vez pelo init_point (checkout do MP) e as
// cobranças seguintes acontecem sozinhas na recorrência definida.
// ---------------------------------------------------------------------------

export interface MpPreapproval {
  preapprovalId: string;
  initPoint: string; // link onde o pagador autoriza a recorrência
  status: string;    // 'pending' | 'authorized' | 'paused' | 'cancelled'
}

/**
 * Cria uma assinatura (preapproval) sem meio de pagamento definido.
 * O pagador escolhe Pix Automático (ou cartão) ao abrir o init_point.
 * @param externalReference - ID da pix_subscription no nosso banco
 */
export async function createMpPreapproval(opts: {
  amountCents: number;
  reason: string;
  payerEmail: string;
  externalReference: string;
  frequencyMonths: number; // 1 = mensal, 12 = anual
  backUrl: string;
}): Promise<MpPreapproval> {
  const token = getAccessToken();

  const response = await fetch(`${MP_BASE_URL}/preapproval`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Idempotency-Key': opts.externalReference,
    },
    body: JSON.stringify({
      reason: opts.reason,
      external_reference: opts.externalReference,
      payer_email: opts.payerEmail,
      auto_recurring: {
        frequency: opts.frequencyMonths,
        frequency_type: 'months',
        transaction_amount: opts.amountCents / 100,
        currency_id: 'BRL',
      },
      back_url: opts.backUrl,
      status: 'pending',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`[MercadoPago] Erro ao criar assinatura: ${err}`);
  }

  const data = await response.json() as any;
  return {
    preapprovalId: String(data.id),
    initPoint: data.init_point ?? '',
    status: data.status ?? 'pending',
  };
}

/** Consulta o status atual de uma assinatura no Mercado Pago. */
export async function getMpPreapproval(preapprovalId: string): Promise<{
  status: string;
  externalReference: string;
  nextPaymentDate: string | null;
}> {
  const token = getAccessToken();

  const response = await fetch(`${MP_BASE_URL}/preapproval/${preapprovalId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`[MercadoPago] Erro ao consultar assinatura ${preapprovalId}: ${err}`);
  }

  const data = await response.json() as any;
  return {
    status: data.status ?? 'pending',
    externalReference: data.external_reference ?? '',
    nextPaymentDate: data.next_payment_date ?? null,
  };
}

/** Cancela uma assinatura no Mercado Pago (o pagador para de ser cobrado). */
export async function cancelMpPreapproval(preapprovalId: string): Promise<void> {
  const token = getAccessToken();

  const response = await fetch(`${MP_BASE_URL}/preapproval/${preapprovalId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ status: 'cancelled' }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`[MercadoPago] Erro ao cancelar assinatura ${preapprovalId}: ${err}`);
  }
}

/**
 * Consulta uma cobrança recorrente (authorized payment) de uma assinatura.
 * O webhook 'subscription_authorized_payment' entrega só o id — os detalhes
 * (assinatura dona, status do pagamento) vêm desta consulta.
 */
export async function getMpAuthorizedPayment(authorizedPaymentId: string): Promise<{
  preapprovalId: string;
  amountCents: number;
  paymentId: string | null;
  paymentStatus: string | null;
}> {
  const token = getAccessToken();

  const response = await fetch(`${MP_BASE_URL}/authorized_payments/${authorizedPaymentId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`[MercadoPago] Erro ao consultar cobrança ${authorizedPaymentId}: ${err}`);
  }

  const data = await response.json() as any;
  return {
    preapprovalId: String(data.preapproval_id ?? ''),
    amountCents: Math.round((data.transaction_amount ?? 0) * 100),
    paymentId: data.payment?.id ? String(data.payment.id) : null,
    paymentStatus: data.payment?.status ?? null,
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
