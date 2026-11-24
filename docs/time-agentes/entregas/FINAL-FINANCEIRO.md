# Financeiro — resultado da investigação executada

Complemento aprofundado executado em 24/11/2026 às 09:06 de Boa Vista, descrito ao final. Não há correção financeira aplicada.

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

## Complemento: origem, rastreabilidade e correção proposta

### Stripe: zeros preservados e rastreabilidade insuficiente

Nova leitura confirmou: os 20 zeros têm vencimento; nenhum possui evento Stripe positivo para a mesma conta e vencimento. Oito dos 20 têm outro evento Stripe para a mesma conta/vencimento (isso conta eventos associados, não oito cobranças duplicadas). Dezessete estão associados a contas com referência de cliente Stripe preenchida; o restante não tem esse vínculo no cadastro atual. Nenhum identificador foi exportado.

No código atual, `StripeController.ts:497` aceita `session.amount_total=0`, `:590` aceita `invoice.amount_paid=0` e `:647` só usa preço de fallback quando valor é nulo. Portanto zero é um valor possível conservado, não defeito aritmético demonstrado. Sem fatura original e seus descontos, não há base para convertê-lo em valor positivo nem afirmar que todos são gratuitos.

Outra limitação concreta: `premium_events` guarda fonte, tipo e montante, mas não ID da fatura/pagamento/evento Stripe. A deduplicação no código usa conta + fonte + vencimento (`StripeController.ts:632`), não uma chave financeira única. Não é possível concluir a origem de cada zero ou eliminar toda duplicidade pela evidência local disponível.

### A receita histórica contém possibilidade de valores estimados

`backend/src/infrastructure/database/migrate.ts:1425` contém rotinas que preenchem valores nulos de Stripe com preços fixos; PIX com o pedido aprovado temporalmente mais próximo; e RevenueCat/app_sync com preço padrão em determinados casos (`:1450` e `:1460`). Não há coluna de proveniência para distinguir valores originalmente recebidos de valores preenchidos por essas rotinas. O código existe; esta análise não executou migração e não prova quais linhas foram alteradas por ela.

Consequência: os R$ 3.334,65 devem permanecer rotulados **valores positivos registrados**, com possível componente estimado. Não podem ser apresentados como faturamento conciliado. Zeros não são alterados por essas rotinas porque a condição é `amount_cents IS NULL`.

### Master manual sem vencimento

O aprofundamento encontrou duas solicitações PIX rejeitadas, nenhuma aprovada, nenhum premium_event, nenhum vínculo de cliente Stripe e nenhuma recorrência PIX para a categoria investigada. O código do administrador permite atualização manual de plano (`AdminController.ts:491`) sem que isso seja evidência financeira. Não há tabela com nome de auditoria detectada na consulta ao schema; essa ausência não prova inexistência de registros em logs externos. Origem exata da concessão continua não demonstrável nessas tabelas. Manter acesso até decisão fundamentada; não cobrar com base nas solicitações rejeitadas.

### Premium PIX com validade divergente

A conta tem um evento positivo PIX com validade passada e um EXPIRED_BY_CRON sem validade/valor; nenhum evento futuro. O vencimento em users é posterior ao último vencimento de evento. Existe pedido PIX aprovado, mas não há pedido aprovado revisado depois do último evento positivo PIX nem cobrança recorrente aprovada. Isso confirma desencontro de estado/histórico, sem demonstrar novo pagamento ou dívida.

O código permite atualizar plano no administrador e em vários fluxos de pagamento; sem auditoria de origem/ID do ciclo não é possível atribuir a divergência a um fluxo específico. Corrigir o acesso automaticamente poderia revogar uma concessão legítima ou conceder dias indevidos, então nenhuma correção foi feita.

### Cobertura de IDs de pagamentos PIX

138 solicitações PIX de assinatura aprovadas no banco somam R$ 2.574,17; 115 têm `mp_payment_id`, 23 não têm. Há também 17 rejeitadas, 13 com ID. Esses pedidos são outra população comparada aos 144 eventos positivos registrados de fonte pix (R$ 2.662,26); não foram somados como receitas adicionais nem usados para inferir prejuízo. Aprovação manual, recorrência e duplicação de eventos podem afetar a correspondência, que não está provada pelo agregado. IDs de pagamento existem em pix_requests e pix_subscription_charges; premium_events não registra vínculo direto ao pedido/cobrança.

### Correção concreta proposta, sem implementação financeira

Separar evento de acesso de transação financeira; armazenar IDs de origem (evento, fatura, pagamento e pedido), moeda, valor efetivo e proveniência (`provider_confirmed`, `manual_verified`, `estimated` ou `unknown`). Criar unicidade por provedor e ID financeiro, mantendo evento de webhook em chave separada para rastrear entregas. Deduplicação deve resistir a eventos em ordens diferentes e concorrentes. Conservar zero confirmado como zero; nunca preencher valor ausente automaticamente a partir de preço de tabela. Relatórios devem separar desconhecido/estimado de confirmado.

Para concessão administrativa, registrar motivo, origem, operador e antes/depois em auditoria privada, sem inventar evento de pagamento. Para PIX, relacionar acesso, solicitação aprovada e cobrança pela chave original, não apenas conta/data aproximada. Não executar backfill corretivo histórico até conferir documentos e preservar trilha de alteração.

Regressões necessárias antes de qualquer futura implementação: evento repetido da mesma fatura, checkout/fatura em ordens diferentes, desconto integral zero, moeda ausente, valor desconhecido sem fallback, renovação distinta, concessão manual sem pagamento e PIX com atualização concorrente. São testes propostos de uma mudança ainda não aplicada, não testes técnicos já aprovados.

### Testes deste complemento

Consulta somente leitura autorizada, TLS verificado, statement_timeout de 12s e ROLLBACK. Evidência agregada: `operacao/2026-11-24-financeiro-diagnostico-profundo.json`. Conferidos: 20 zeros com validade, zero positivo para mesma validade, 8 associações repetidas, 17 vínculos de cliente; uma divergência PIX; duas solicitações manuais rejeitadas; aprovados PIX 138 = 115 com ID + 23 sem ID. Fontes locais e colunas relevantes confirmadas. Resultado das verificações agregadas: PASS. Não foram usados dados de API financeira, nem demonstrada causa individual dos zeros ou legitimidade das concessões; não houve alteração de produto/banco, transação ou envio.
