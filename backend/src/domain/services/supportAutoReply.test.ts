import { getAutomaticSupportReply } from './supportAutoReply';

const adminCancellationPrompt = {
  id: 'admin-1', userId: 'user-1', senderType: 'admin' as const, imageUrl: null, readAt: null,
  message: 'Entendo que você pensa em cancelar. Antes de seguir, você pode me contar o motivo?',
  createdAt: new Date().toISOString(),
};

describe('getAutomaticSupportReply', () => {
  it('explains how to calculate a sale price', () => {
    expect(getAutomaticSupportReply('Como calculo meu preço de venda?')).toContain('ingredientes');
  });

  it('explains where to record expenses', () => {
    expect(getAutomaticSupportReply('Onde vejo meus gastos do mês?')).toContain('Gastos');
  });

  it('asks the reason before giving cancellation instructions', () => {
    const reply = getAutomaticSupportReply('Quero cancelar minha assinatura');
    expect(reply).toContain('me contar o motivo');
    expect(reply).not.toContain('Perfil > Meu plano');
  });

  it('gives cancellation instructions only after explicit confirmation', () => {
    const reply = getAutomaticSupportReply('quero continuar com o cancelamento', [adminCancellationPrompt]);
    expect(reply).toContain('Perfil > Meu plano');
  });

  it('keeps the retention conversation after a reason is shared', () => {
    const reply = getAutomaticSupportReply('Está ficando caro para mim', [adminCancellationPrompt]);
    expect(reply).toContain('Quer que eu ajude');
  });
});
