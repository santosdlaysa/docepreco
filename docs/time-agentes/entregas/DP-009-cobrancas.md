# DP-009 — Cobranças

Entrega de 24/11/2026. Cinco modelos e matriz concluídos. Nenhum envio, débito ou alteração de acesso executado. Indicadores não medidos.

## Matriz de decisão

| Estado verificado | Canal | Ação permitida na preparação | Impedimento |
| --- | --- | --- | --- |
| Vigente, renovação manual, vencimento futuro confirmado | Canal original verificado | Modelo 1 | Pagamento já aprovado, recusa ou disputa |
| Vigente com renovação automática habilitada | Stripe, loja ou outro recorrente | Orientar gerenciamento se solicitado | Não solicitar segundo pagamento como lembrete padrão |
| Vencimento hoje, renovação manual confirmada | Canal original | Modelo 2 | Não presumir hora do bloqueio nem vencimento universal |
| Renovação falhou e nenhum pagamento posterior foi aprovado | Canal original | Modelo 3 | Reconsulta necessária antes de qualquer envio |
| Acesso expirado e não há pagamento em processamento | Canal original | Modelo 4, convite de retorno | Expiração não é dívida; recusa encerra fluxo |
| Cliente informa pagamento, divergência, duplicidade ou contestação | Qualquer | Modelo 5 e encaminhar ao financeiro | Suspender lembretes e novas tentativas |
| Pagamento pendente/em processamento | Qualquer | Aguardar confirmação e investigar prazo do canal | Não induzir novo pagamento |
| Cancelamento/recusa de contato | Qualquer | Encerrar fluxo | Não insistir nem tratar cancelamento como débito |
| Status/canal desconhecido | Qualquer | Triagem interna | Nenhum contato individual de cobrança |

Para App Store/Google Play, orientar o gerenciamento da assinatura pelo canal de compra verificado; não criar link de pagamento externo como substituto. Stripe e Mercado Pago também exigem confirmar recorrência, status e destino oficial; não presumir que toda assinatura Mercado Pago é renovação manual.

## Cinco textos

### Modelo 1 — Lembrete de vencimento confirmado

Olá, [nome]! Seu acesso ao DocePreço está válido até [data confirmada]. Se quiser continuar, posso te orientar sobre a renovação pelo canal em que você assinou.

### Modelo 2 — Vencimento no dia

Olá, [nome]! Hoje é a data de vencimento do seu acesso ao DocePreço. Quer ajuda para renovar pelo seu canal de assinatura?

### Modelo 3 — Falha de renovação

Olá, [nome]! A última tentativa de renovação da sua assinatura do DocePreço não foi concluída. Quer ajuda para verificar a situação no canal em que você assinou? Se já pagou, avise para conferirmos antes de qualquer nova tentativa.

### Modelo 4 — Convite após expiração

Olá, [nome]! Seu período de acesso ao plano pago do DocePreço terminou. Se quiser voltar, posso te apresentar as opções atuais e orientar a renovação. Gostaria de saber mais?

### Modelo 5 — Pagamento informado

Obrigada por avisar, [nome]. Vamos conferir o pagamento antes de orientar qualquer nova tentativa. Você pode informar a data e o canal em que pagou? Se precisar enviar um comprovante, oculte os dados pessoais e financeiros que não forem necessários para a conferência.

Campos entre colchetes identificam modelos, não mensagens individualizadas prontas para envio. Datas só entram após verificar fuso e validade da conta. Valores e links foram deliberadamente omitidos porque não há fonte atual consultada para um cliente específico. Não acrescentar preços, promessa de reembolso ou horário de corte sem validação.

## Revisão antes de cada contato

1. Confirmar identificação minimizada da conta, plano atual, canal de contratação, recorrência, validade e status da última transação em fonte autorizada atual.
2. Reconsultar pagamento imediatamente antes do envio. A lista de ontem não comprova pendência hoje.
3. Verificar recusa, cancelamento, disputa, pagamento informado, contato recente e fluxo de outra área. Manter apenas um responsável por conta e suprimir duplicatas por conta + ciclo + finalidade.
4. Se houver divergência, encaminhar ao Financeiro conforme DP-008; não enviar cobrança enquanto a apuração estiver aberta.
5. Confirmar destinatário e texto final. Aplicar apenas autorização de envio já existente para essa ação/rotina; a preparação destes modelos não constitui autorização.
6. Registrar status do envio efetivamente retornado pelo canal, nunca marcar como entregue apenas porque foi solicitado. Não repetir mensagem por timeout sem conferir estado.

Cadência inicial proposta para avaliação: um lembrete de renovação manual dois dias antes; no dia, apenas se não houver pagamento/resposta e o envio estiver autorizado; após falha/expiração, no máximo um convite de ajuda/retorno no ciclo. Aguardar resposta e encerrar após recusa. Não agendado e sujeito às regras do canal e revisão comercial. Evitar sobreposição com DP-002 e DP-006.

## Testes e pendências

Casos de revisão: pagamento aprovado após geração da lista → excluir; cancelada → não cobrar; expirada → convite, não dívida; automática vigente → não pedir pagamento manual; falha com pagamento posterior → excluir; pagamento informado → pausar e financeiro; canal desconhecido → bloquear personalização; webhook duplicado → não duplicar contato. Todos os resultados esperados foram conferidos na matriz e nos textos; não houve execução real de envio ou consulta externa.

Fontes: `docs/time-agentes/BASE.md`, `cobrancas.md`, `financeiro.md`, entrega DP-008 e os serviços de Stripe/Mercado Pago/RevenueCat nela referenciados. Estado local não confirma conta individual em produção.

Aceite: cinco modelos, elegibilidade/exclusões e encaminhamento prontos. Pendências para executar: status e canal atuais, destinatários autorizados, política vigente de cancelamento, links oficiais quando necessários e autorização de envio. Responsável pela validação: Cobranças, com Financeiro para divergências. Indicador após eventual execução: renovações confirmadas em sete dias / contatos elegíveis efetivamente enviados, por canal e ciclo; registrar reclamações e duplicidades separadamente. Associação temporal não prova causalidade.
