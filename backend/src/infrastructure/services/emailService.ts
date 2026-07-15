import { Resend } from 'resend';
import { pool } from '../database/connection';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetCode(email: string, code: string): Promise<void> {
  const digits = code.split('').map(d =>
    `<td style="width:44px;height:52px;background:#FFF0F3;border:2px solid #F8BBD9;border-radius:10px;text-align:center;font-size:28px;font-weight:700;color:#E91E8C;font-family:Arial,sans-serif;">${d}</td>`
  ).join('<td style="width:8px;"></td>');

  await resend.emails.send({
    from: 'Precifica Doces <noreply@docepreco.site>',
    to: email,
    subject: 'Seu codigo de recuperacao - Precifica Doces',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FFF0F3;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF0F3;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(233,30,140,0.08);">

        <!-- Header -->
        <tr><td style="background:#E91E8C;padding:32px 40px;text-align:center;">
          <div style="width:64px;height:64px;border-radius:16px;background:rgba(255,255,255,0.2);margin:0 auto 12px;line-height:64px;font-size:32px;">&#127856;</div>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:-0.3px;">Precifica Doces</h1>
          <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.85);">Gestao inteligente para confeiteiros</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px 24px;">
          <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#2D1B14;">Recuperacao de senha</h2>
          <p style="margin:0 0 28px;font-size:15px;color:#8B7355;line-height:1.6;">
            Recebemos uma solicitacao para redefinir sua senha. Use o codigo abaixo para continuar:
          </p>

          <!-- Codigo -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
            <tr>${digits}</tr>
          </table>

          <!-- Timer -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;background:#FFF8F0;border-radius:10px;">
            <tr><td style="padding:12px 20px;text-align:center;">
              <span style="font-size:13px;color:#8B4513;">&#9200; Este codigo expira em <strong>15 minutos</strong></span>
            </td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #F0D5DC;margin:0 0 20px;" />

          <p style="margin:0;font-size:13px;color:#B5A090;line-height:1.5;">
            Se voce nao solicitou essa recuperacao, ignore este email. Sua senha permanecera a mesma.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#FFF8F0;padding:20px 40px;text-align:center;border-top:1px solid #F0D5DC;">
          <p style="margin:0;font-size:12px;color:#B5A090;">
            &copy; ${new Date().getFullYear()} Precifica Doces &bull; docepreco.site
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `,
  });
}

export interface UpdateEmailContent {
  subject: string;
  intro: string;
  features: string[];
  ctaText: string;
  ctaUrl: string;
}

const DEFAULT_EMAIL_CONTENT: UpdateEmailContent = {
  subject: 'Nova versao disponivel! Atualize seu Precifica Doces',
  intro: 'Temos uma <strong>nova versao</strong> do Precifica Doces com varias melhorias para voce!',
  features: [
    'Notificacoes push — Receba avisos importantes direto no celular',
    'Dicas motivacionais — Dicas diarias para impulsionar seu negocio',
    'Banners informativos — Fique por dentro das novidades',
    'Melhorias de desempenho — App mais rapido e estavel',
  ],
  ctaText: 'Atualizar agora',
  ctaUrl: 'https://apps.apple.com/app/precifica-doces/id6744712907',
};

export async function sendUpdateEmail(email: string, companyName: string, content?: Partial<UpdateEmailContent>): Promise<void> {
  const c = { ...DEFAULT_EMAIL_CONTENT, ...content };

  const featuresHtml = c.features
    .map(f => `<tr><td style="padding:8px 0;font-size:14px;color:#5D4037;">&#10003; ${f}</td></tr>`)
    .join('');

  await resend.emails.send({
    from: 'Precifica Doces <noreply@docepreco.site>',
    to: email,
    subject: c.subject,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FFF0F3;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF0F3;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(233,30,140,0.08);">

        <!-- Header -->
        <tr><td style="background:#E91E8C;padding:32px 40px;text-align:center;">
          <div style="width:64px;height:64px;border-radius:16px;background:rgba(255,255,255,0.2);margin:0 auto 12px;line-height:64px;font-size:32px;">&#127856;</div>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:-0.3px;">Precifica Doces</h1>
          <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.85);">Gestao inteligente para confeiteiros</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px 24px;">
          <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#2D1B14;">Ola, ${companyName}! &#128075;</h2>
          <p style="margin:0 0 20px;font-size:15px;color:#8B7355;line-height:1.6;">
            ${c.intro}
          </p>

          <h3 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#E91E8C;">O que ha de novo:</h3>

          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;width:100%;">
            ${featuresHtml}
          </table>

          <!-- CTA -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
            <tr><td style="background:#E91E8C;border-radius:12px;padding:14px 32px;text-align:center;">
              <a href="${c.ctaUrl}" style="font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;">${c.ctaText} &#128640;</a>
            </td></tr>
          </table>

          <p style="margin:0 0 16px;font-size:14px;color:#8B7355;line-height:1.6;text-align:center;">
            Acesse a <strong>App Store</strong> ou <strong>Play Store</strong> e atualize para a versao mais recente.
          </p>

          <hr style="border:none;border-top:1px solid #F0D5DC;margin:0 0 20px;" />

          <p style="margin:0;font-size:13px;color:#B5A090;line-height:1.5;">
            Obrigado por usar o Precifica Doces! Estamos sempre trabalhando para melhorar sua experiencia.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#FFF8F0;padding:20px 40px;text-align:center;border-top:1px solid #F0D5DC;">
          <p style="margin:0;font-size:12px;color:#B5A090;">
            &copy; ${new Date().getFullYear()} Precifica Doces &bull; docepreco.site
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `,
  });
}

export interface WinbackEmailContent {
  discountPercent: number;
  /** Ex.: "R$ 14,90" */
  fullPriceLabel: string;
  /** Ex.: "R$ 7,45" */
  discountedPriceLabel: string;
  /** Data limite da oferta, já formatada (ex.: "22/07/2026"). */
  validUntilLabel: string;
}

export async function sendWinbackEmail(email: string, companyName: string, offer: WinbackEmailContent): Promise<void> {
  await resend.emails.send({
    from: 'Precifica Doces <noreply@docepreco.site>',
    to: email,
    subject: `Sentimos sua falta! Volte com ${offer.discountPercent}% de desconto`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FFF0F3;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF0F3;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(233,30,140,0.08);">

        <!-- Header -->
        <tr><td style="background:#E91E8C;padding:32px 40px;text-align:center;">
          <div style="width:64px;height:64px;border-radius:16px;background:rgba(255,255,255,0.2);margin:0 auto 12px;line-height:64px;font-size:32px;">&#127873;</div>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:-0.3px;">Precifica Doces</h1>
          <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.85);">Gestao inteligente para confeiteiros</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px 24px;">
          <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#2D1B14;">Sentimos sua falta, ${companyName}! &#128150;</h2>
          <p style="margin:0 0 24px;font-size:15px;color:#8B7355;line-height:1.6;">
            Sua assinatura expirou, mas suas receitas, precos e relatorios continuam guardados esperando por voce.
            Para facilitar sua volta, preparamos uma oferta exclusiva:
          </p>

          <!-- Oferta -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#FFF0F3;border:2px dashed #E91E8C;border-radius:14px;">
            <tr><td style="padding:24px;text-align:center;">
              <p style="margin:0 0 4px;font-size:14px;color:#8B7355;">Primeiro mes de volta com</p>
              <p style="margin:0 0 8px;font-size:36px;font-weight:800;color:#E91E8C;">${offer.discountPercent}% OFF</p>
              <p style="margin:0;font-size:15px;color:#5D4037;">
                <span style="text-decoration:line-through;color:#B5A090;">${offer.fullPriceLabel}</span>
                &nbsp;&#8594;&nbsp; <strong style="font-size:18px;">${offer.discountedPriceLabel}</strong>
              </p>
            </td></tr>
          </table>

          <p style="margin:0 0 20px;font-size:15px;color:#5D4037;line-height:1.7;">
            <strong>Como usar:</strong> abra o app Precifica Doces, toque em <strong>Assinar via PIX</strong> e pronto —
            o desconto ja e aplicado automaticamente no valor do seu PIX. Nao precisa de cupom.
          </p>

          <!-- Timer -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;background:#FFF8F0;border-radius:10px;">
            <tr><td style="padding:12px 20px;text-align:center;">
              <span style="font-size:13px;color:#8B4513;">&#9200; Oferta valida ate <strong>${offer.validUntilLabel}</strong></span>
            </td></tr>
          </table>

          <!-- CTA lojas -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
            <tr><td style="background:#E91E8C;border-radius:12px;padding:14px 32px;text-align:center;">
              <a href="https://apps.apple.com/app/precifica-doces/id6744712907" style="font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;">Abrir o app e voltar &#127856;</a>
            </td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #F0D5DC;margin:0 0 20px;" />

          <p style="margin:0;font-size:13px;color:#B5A090;line-height:1.5;">
            Se voce ja renovou, pode ignorar este email. Qualquer duvida, e so responder por aqui.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#FFF8F0;padding:20px 40px;text-align:center;border-top:1px solid #F0D5DC;">
          <p style="margin:0;font-size:12px;color:#B5A090;">
            &copy; ${new Date().getFullYear()} Precifica Doces &bull; docepreco.site
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `,
  });
}

export async function sendBulkUpdateEmail(content?: Partial<UpdateEmailContent>): Promise<{ sent: number; failed: number }> {
  const { rows } = await pool.query('SELECT email, company_name FROM users ORDER BY created_at');
  let sent = 0;
  let failed = 0;

  for (const user of rows) {
    try {
      await sendUpdateEmail(user.email, user.company_name, content);
      sent++;
      // Resend rate limit: small delay between emails
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error(`[Email] Failed to send update to ${user.email}:`, err);
      failed++;
    }
  }

  return { sent, failed };
}
