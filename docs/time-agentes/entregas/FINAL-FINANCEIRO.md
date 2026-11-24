# Financeiro — resultado da investigação executada

Consulta autorizada em 24/11/2026 às 08:56 de Boa Vista (12:56 UTC), seguida de complemento agregado na mesma rodada. Sessões PostgreSQL somente leitura, TLS com validação do certificado, timeout de consulta de 12 segundos e encerramento com ROLLBACK. Nenhuma alteração, cobrança, envio ou consulta a provedor financeiro foi realizada.

## 1. Os 20 eventos foram classificados

Todos são INITIAL_PURCHASE de origem Stripe, plataforma card, com **valor exatamente zero**. Não são valores nulos nem negativos. Referem-se a **14 contas distintas**, não 20 clientes devedores.

| Mês UTC | Categoria Master | Categoria Premium | Eventos |
| --- | ---: | ---: | ---: |
| Julho/2026 | 2 | 1 | 3 |
| Agosto/2026 | 1 | 2 | 3 |
| Setembro/2026 | 0 | 4 | 4 |
| Outubro/2026 | 2 | 2 | 4 |
| Novembro/2026, parcial | 4 | 2 | 6 |
| Total | 9 | 11 | 20 |

As categorias foram derivadas do identificador de produto contendo master/premium; não comprovam plano atual. Dos 20 eventos, 11 pertencem a sete contas atualmente ativas. Entre as 14 contas, 12 têm também algum evento histórico de compra/renovação com valor positivo. Portanto, a análise não sustenta classificar todos os casos como falta de pagamento. O motivo do valor zero — desconto, gratuidade, integração ou outro — não está demonstrado pelos campos agregados e exige documento de origem Stripe, não preço de tabela presumido.

## 2. O ativo sem vencimento foi identificado por categoria

É **uma conta Master de plataforma manual**, sem registro em premium_events, sem evento positivo, sem indicação de trial_used_at preenchido e sem solicitação PIX de assinatura aprovada encontrada na consulta. Isso caracteriza um acesso manual sem evidência financeira nas fontes verificadas; não comprova que foi indevido, vitalício, teste ou não pago em outro canal. Não houve alteração de acesso.

## 3. As quatro expirações foram separadas

| Vencimento registrado, data UTC | Plano | Plataforma | Resultado de triagem |
| --- | --- | --- | --- |
| 25/11/2026 | Premium | card | Verificar renovação/cancelamento no canal Stripe; não solicitar pagamento manual sem essa verificação |
| 26/11/2026 | Master | pix | Sem registro de recorrência PIX encontrado; confirmar situação atual antes de eventual lembrete |
| 27/11/2026 | Premium | card | Verificar renovação/cancelamento no canal Stripe; não inferir falha de pagamento |
| 30/11/2026 | Premium | iOS | Verificar assinatura no canal de compra; não encaminhar pagamento externo como substituto |

Todas têm evento positivo histórico, nenhuma tem registro de recorrência em pix_subscriptions e todas estão com whatsapp_marketing_opt_in=false. A ausência de recorrência PIX não informa a recorrência do Stripe/Apple. A flag de marketing não resolve sozinha a classificação de comunicação operacional, mas impede tratar essas contas como lista liberada para campanha de marketing. Não foram encontrados estados atuais do provedor: nenhum lembrete foi enviado e nenhum caso foi declarado dívida. Datas acima são UTC; a comunicação deve conferir horário e fuso da validade antes de afirmar o dia local.

## 4. Ativos versus evidência financeira

| Classificação no banco | Contas |
| --- | ---: |
| Ativos administrativos | 23 |
| Com algum evento positivo histórico | 22 |
| Com positivo histórico de origem servidor (webhook/pix/stripe) | 20 |
| Com positivo histórico sem essa origem, plataforma atual iOS | 2 |
| Sem evento positivo histórico, Master manual sem vencimento | 1 |
| Com evento positivo cuja expiration_at ainda é futura | 21 |

Os 23 se dividem em seis card, 14 pix, dois iOS e um manual; 16 Premium e sete Master. Entre os 22 com evento positivo, **uma conta Premium/pix tem validade atual futura, mas nenhum evento positivo com expiration_at futura**. Esse é um desencontro entre evidência de período no evento e acesso atual, não prova de acesso indevido. Pode haver outras concessões ou atualização não representada nesse evento; causa não concluída.

Resultado: 23 acessos ativos não equivalem automaticamente a 23 pagantes comprovados para o ciclo atual. Nem os 21 eventos vinculados a validade futura comprovam repasse bancário. Não foi calculado MRR presumido.

## 5. Totais financeiros e limite da conciliação

O retrato financeiro de 08:45, mantido como fonte temporal separada, registra **R$ 3.334,65** positivos históricos: PIX R$ 2.662,26; Stripe R$ 404,19; app_sync iOS R$ 253,30 e Android R$ 14,90. Novembro parcial UTC soma **R$ 457,47**, em 25 eventos, até aquela consulta. Não foi comparado com mês fechado nem atualizado por extrapolação.

Foi concluída a conferência interna das somas, **não a conciliação de repasses**. Sem relatórios financeiros dos provedores, não é possível comprovar liquidação, taxas, reembolsos, dinheiro recebido ou lucro; despesas também não foram fornecidas. app_sync não comprova confirmação financeira da loja. O histórico agregado não contém identificador financeiro suficiente para excluir toda possível duplicidade entre integrações.

## Evidências e testes executados

Fontes: `operacao/2026-11-24-investigacao-financeira-agregada.json` (nova leitura agregada), `operacao/2026-11-24-assinaturas-banco.json` (retrato anterior), `2026-11-24-financeiro-banco.md`, código de `backend/src/presentation/controllers/StripeController.ts` (gravação de amount_total/amount_paid e eventos). Nenhum nome, e-mail, telefone ou identificador de conta foi salvo na evidência.

Verificações locais: nove grupos de valores zero somam 20 eventos; agrupamento por mês e produto fecha 20; vínculos ativos somam 11 eventos, com sete contas únicas na consulta específica; 22 com positivo + 1 sem = 23; 20 origem servidor + 2 demais + 1 sem = 23; 21 validade de evento futura + 1 com positivo só histórico + 1 sem positivo = 23; plataformas somam 23; quatro expirações agrupadas somam quatro. Totais financeiros anteriores por fontes, meses e tipos coincidem em 333.465 centavos e 200 eventos. Resultado: PASS. Consistência agregada não substitui conciliação com o provedor ou teste de dispositivo.
