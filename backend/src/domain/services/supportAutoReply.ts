import type { SupportMessage } from '../../infrastructure/repositories/PostgresSupportRepository';

const CANCELLATION_PROMPT = 'Entendo que você pensa em cancelar.';
const CANCELLATION_CONTINUATION = 'quero continuar com o cancelamento';
const CANCELLATION_CLOSED = 'Perfeito, vamos encerrar esse assunto por aqui.';

function normalized(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function includesAny(value: string, terms: string[]): boolean {
  return terms.some(term => value.includes(term));
}

function hasActiveCancellationPrompt(messages: SupportMessage[]): boolean {
  const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
  const lastFlowMessage = [...messages]
    .reverse()
    .find(message => message.senderType === 'admin'
      && (message.message.startsWith(CANCELLATION_PROMPT) || message.message.startsWith(CANCELLATION_CLOSED)));
  return !!lastFlowMessage
    && lastFlowMessage.message.startsWith(CANCELLATION_PROMPT)
    && new Date(lastFlowMessage.createdAt).getTime() >= twelveHoursAgo;
}

function declinesCancellation(text: string): boolean {
  return includesAny(text, [
    'nao quero cancelar', 'nao vou cancelar', 'nao quero mais cancelar',
    'desisti', 'mudei de ideia', 'pode deixar', 'deixa pra la', 'deixa para la',
  ]) || /^(nao|nao obrigada|nao obrigado)[!. ]*$/.test(text);
}

/**
 * Answers the most frequent first-contact questions without pretending to be a
 * human agent. Cancellation is intentionally conversational: instructions are
 * only shown after the person confirms they still want to proceed.
 */
export function getAutomaticSupportReply(message: string, history: SupportMessage[] = []): string | null {
  const text = normalized(message);

  if (text.includes(CANCELLATION_CONTINUATION)) {
    return 'Entendi. Para cancelar a renovação automática, abra Perfil > Meu plano e toque em “Cancelar renovação automática”. O plano continua disponível até o fim do período já pago. Se preferir, me conte o que não funcionou para tentarmos resolver antes.';
  }

  if (hasActiveCancellationPrompt(history) && declinesCancellation(text)) {
    return `${CANCELLATION_CLOSED} Fico feliz em continuar com você. Quando precisar, é só chamar a gente aqui no chat.`;
  }

  const asksToCancel = includesAny(text, [
    'cancelar', 'cancelamento', 'cancelar plano', 'cancelar assinatura', 'encerrar assinatura', 'parar assinatura',
  ]);
  if (asksToCancel) {
    return `${CANCELLATION_PROMPT} Antes de seguir, você pode me contar o motivo? Talvez possamos ajudar com preço, uso do app, pagamento ou encontrar um plano que faça mais sentido para você. Se, mesmo assim, quiser cancelar, responda “${CANCELLATION_CONTINUATION}”.`;
  }

  if (hasActiveCancellationPrompt(history)) {
    return `Obrigada por nos contar. Quer que eu ajude a resolver isso agora? Se ainda preferir encerrar, responda “${CANCELLATION_CONTINUATION}” e enviaremos o caminho para cancelar a renovação.`;
  }

  if (includesAny(text, [
    'gasto', 'gastei', 'despesa', 'despesas', 'custo fixo', 'custos fixos', 'financeiro',
  ])) {
    return 'Para acompanhar seus gastos, abra Gastos e registre cada despesa com categoria e valor. Na tela Financeiro, você vê o total do período e como ele afeta o resultado. Quer ajuda para cadastrar um gasto ou interpretar o resumo?';
  }

  if (includesAny(text, [
    'como calcular', 'calcular preco', 'calcular o preco', 'calcular preço', 'preco de venda', 'preço de venda',
    'precificar', 'quanto cobrar', 'margem', 'markup', 'lucro',
  ])) {
    return 'Para calcular o preço, cadastre os ingredientes, embalagens e custos da receita. Depois, em Receitas, informe o rendimento e a margem desejada: o DocePreço soma os custos e sugere o preço de venda. Quer ajuda em alguma dessas etapas?';
  }

  return null;
}
