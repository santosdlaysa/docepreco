import QRCode from 'qrcode';

/**
 * Gera o QR code (PNG em data URL base64) de um payload PIX copia-e-cola.
 * O front só exibe `<img src={...}>`, mesmo padrão dos QRs de assinatura.
 */
export async function generatePixQrBase64(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
  });
}
