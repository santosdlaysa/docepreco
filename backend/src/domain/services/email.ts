/**
 * Validação de e-mail.
 *
 * O regex antigo (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) aceitava domínios quebrados
 * como `fulano@.gmail.com` — o `[^\s@]+` depois do `@` casava com `.gmail` e o
 * cadastro passava. O e-mail só era rejeitado lá na frente, pelo Stripe
 * ("Invalid email address: ...") e pelo Mercado Pago, deixando o usuário sem
 * conseguir assinar e sem saber o motivo.
 *
 * Aqui o domínio é validado label a label: cada label começa e termina com
 * letra/número, e o TLD tem pelo menos 2 letras.
 */

const LOCAL_PART = "[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*";
const DOMAIN_LABEL = '[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?';
const EMAIL_REGEX = new RegExp(
  `^${LOCAL_PART}@(?:${DOMAIN_LABEL}\\.)+[a-zA-Z]{2,}$`
);

/** Máximo aceito pela RFC 5321 — evita guardar lixo no banco. */
const MAX_EMAIL_LENGTH = 254;

/** Mensagem única para conta com e-mail que nenhum gateway de pagamento aceita. */
export const INVALID_ACCOUNT_EMAIL_ERROR =
  'O e-mail da sua conta é inválido e por isso o pagamento não pode ser criado. Fale com o suporte para corrigi-lo.';

export function isValidEmail(email: unknown): email is string {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_EMAIL_LENGTH) return false;
  return EMAIL_REGEX.test(trimmed);
}
