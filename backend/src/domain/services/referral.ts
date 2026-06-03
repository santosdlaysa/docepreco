/**
 * Programa de indicação ("Indique e ganhe").
 * Aberto a todos os níveis: a cada N indicações válidas o indicador ganha
 * REWARD_DAYS dias de assinatura. Uma indicação fica válida quando o indicado
 * cria a 1ª receita (ver RecipeController.create).
 */
export const REFERRALS_PER_REWARD = 5;
export const REWARD_DAYS = 30;

// Alfabeto base32 sem caracteres ambíguos (sem 0/O/1/I) para o código ser fácil
// de ditar e digitar.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 8;

/** Gera um código de indicação aleatório (não garante unicidade — o repo faz retry). */
export function generateReferralCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

/** Normaliza um código digitado pelo usuário (uppercase, sem espaços/ambíguos). */
export function normalizeReferralCode(input: string): string {
  return String(input)
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .slice(0, CODE_LENGTH);
}
