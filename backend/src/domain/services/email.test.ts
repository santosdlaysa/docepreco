import { isValidEmail } from './email';

describe('isValidEmail', () => {
  it('aceita e-mails comuns', () => {
    expect(isValidEmail('palomasa184@gmail.com')).toBe(true);
    expect(isValidEmail('maria.silva+doces@hotmail.com')).toBe(true);
    expect(isValidEmail('contato@doce-preco.com.br')).toBe(true);
    expect(isValidEmail('  fulano@outlook.com  ')).toBe(true);
  });

  it('rejeita o domínio quebrado que o Stripe/MP recusava', () => {
    expect(isValidEmail('palomasa184@.gmail.com')).toBe(false);
    expect(isValidEmail('fulano@gmail..com')).toBe(false);
    expect(isValidEmail('fulano@gmail.com.')).toBe(false);
    expect(isValidEmail('fulano@-gmail.com')).toBe(false);
    expect(isValidEmail('fulano@gmail-.com')).toBe(false);
  });

  it('rejeita formatos inválidos', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('   ')).toBe(false);
    expect(isValidEmail('semarroba.com')).toBe(false);
    expect(isValidEmail('@gmail.com')).toBe(false);
    expect(isValidEmail('fulano@')).toBe(false);
    expect(isValidEmail('fulano@gmail')).toBe(false);
    expect(isValidEmail('fulano@gmail.c')).toBe(false);
    expect(isValidEmail('.fulano@gmail.com')).toBe(false);
    expect(isValidEmail('fulano.@gmail.com')).toBe(false);
    expect(isValidEmail('fulano com espaco@gmail.com')).toBe(false);
    expect(isValidEmail('dois@arrobas@gmail.com')).toBe(false);
  });

  it('rejeita valores que não são string ou excedem o limite da RFC', () => {
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail(123)).toBe(false);
    expect(isValidEmail(`${'a'.repeat(250)}@gmail.com`)).toBe(false);
  });
});
