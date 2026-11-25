# Financeiro e cobranças — 25/11/2026

## Retomada manual de hoje

O retrato de 08:38 permanece a última consulta desta entrega. Esta retomada não repetiu acesso ao banco nem consultou Stripe ou Mercado Pago. Os dois casos prioritários abaixo estão **aguardando fonte do provedor**, e não foram classificados como dívida ou falha de renovação.

| Caso | Evidência mínima que falta | Decisão possível após evidência |
| --- | --- | --- |
| Premium/card com validade em 25/11 UTC | Exportação privada da assinatura Stripe vinculada à conta: referência da assinatura, status, cancel_at_period_end/cancel_at, fim efetivo do período nos itens ou no formato legado disponível, referência e status da última fatura, valor efetivamente pago, moeda e instante da confirmação. Vincular documento à conta em armazenamento privado, sem salvar IDs no repositório. | Se renovação automática estiver vigente, aguardar/verificar o ciclo; se houver falha comprovada sem pagamento posterior, orientar pelo canal; se cancelada ou contestada, não insistir. A data local depende do horário de validade, não só da data UTC. |
| Master/pix com validade em 26/11 UTC | Exportação privada do pedido/pagamento: referência do pedido, external_reference quando disponível, mp_payment_id, status atual, valor e moeda efetivos, data da aprovação e eventuais reembolsos/contestação. Para determinar recorrência, identificar se há contrato relacionado, referência mp_preapproval_id, status atual, frequência, último débito confirmado e eventual cancelamento. Não presumir recorrência ou renovação manual apenas pela plataforma pix. | Pagamento em processamento: aguardar; aprovado: conciliar acesso antes de novo pagamento; recorrência vigente: conferir débito; renovação manual confirmada: preparar orientação somente após excluir pagamento posterior, disputa e recusa. |

Os campos são requisitos de revisão, não dados já obtidos. As referências financeiras completas devem permanecer privadas. Se o provedor exportar formato diferente, mapear os equivalentes e registrar a origem; não inventar campo ausente ou preencher com preço atual.

**Por que o banco não encerra a checagem:** users contém acesso/validade e plataforma; premium_events não preserva os IDs de fatura/pagamento necessários para confirmar o ciclo financeiro original. Um vencimento futuro não demonstra renovação automática ligada, e um evento antigo não comprova o pagamento do próximo ciclo. pix_requests e pix_subscriptions refletem registros locais que precisam de confirmação atual quando usados para decidir contato ou débito. Não há nesta extração documentos de taxas, composição de lotes e crédito bancário; portanto nem valor positivo registrado, nem status de acesso demonstram líquido recebido. Para confirmar repasse, exigir lote, moeda, valor líquido, taxas/ajustes e data do crédito, vinculados ao extrato ou documento financeiro do provedor. Não somar esse repasse novamente como outra venda.

**Textos revisados, apenas modelos:**

- Card: “Quer ajuda para conferir sua renovação do DocePreço no canal em que você assinou? Se já houve pagamento, vamos verificar antes de orientar qualquer nova tentativa.”
- PIX: “Se quiser continuar com seu plano do DocePreço, podemos conferir a situação da renovação pelo seu canal de assinatura. Se já pagou, avise para verificarmos o acesso.”

Os modelos não afirmam dívida, cobrança em atraso, pagamento recusado ou falha no provedor. Antes de usá-los, verificar autorização, destinatário, validade atual, pagamento posterior e recusas. Nada foi enviado ou agendado nesta retomada.

**Fontes e verificação desta retomada:** referências previamente examinadas: `backend/src/presentation/controllers/StripeController.ts` (isCancelScheduled, latestInvoicePaid, periodEndOf, tratamento de invoice.amount_paid), `backend/src/infrastructure/services/mercadoPagoService.ts`, tabelas pix_requests/pix_subscriptions/pix_subscription_charges e evidências agregadas da rodada anterior. A tentativa de releitura local nesta retomada foi bloqueada antes de executar pelo ambiente Windows: sandbox ausente ou desatualizado. Por isso não se afirma nova validação dos arquivos atuais, nova conferência do provedor ou novo teste aritmético. Os testes PASS da consulta de 08:38 permanecem documentados adiante, sem reexecução redundante.

Consulta executada às **08:38:14 de Boa Vista (12:38:14 UTC)**. Banco em sessão somente leitura, snapshot REPEATABLE READ, TLS com validação do certificado e timeout de 12 segundos. Dados agregados, sem nomes, contatos ou identificadores de contas. Nenhuma alteração, cobrança, tentativa de débito ou mensagem enviada.

## Resultado do financeiro

| Indicador | Hoje | Retrato anterior, 24/11 às 08:45 |
| --- | ---: | ---: |
| Contas cadastradas | 2.152 | 2.140 |
| Ativos pelo critério administrativo | 25 | 23 |
| Premium | 18 | 16 |
| Master | 7 | 7 |
| Ativos sem vencimento | 1 | 1 |
| Expiração nos próximos sete dias | 4 | 4 |
| Valores positivos registrados em novembro, parcial UTC | R$ 495,45 | R$ 457,47 |
| Valores positivos históricos registrados | R$ 3.372,63 | R$ 3.334,65 |

Há **12 contas e dois acessos ativos a mais** entre os retratos. Os valores positivos registrados aumentaram **R$ 37,98**, com dois eventos a mais de fonte pix/INITIAL_PURCHASE. Isso é variação de registros agregados: não comprova repasse, não atribui causalidade comercial e não demonstra que os dois ativos são exatamente as mesmas contas dos dois eventos. A comparação utiliza as mesmas tabelas, BRL, tipos financeiros e regra de acesso; não compara mês parcial com mês fechado. Os horários dos retratos são diferentes, portanto não representam dois dias completos equivalentes.

**125 contas estão expiradas** segundo a regra atual do dashboard: premium_until não nulo e menor ou igual ao instante da consulta, independentemente de is_premium. Esse total não significa dívida, intenção de renovar nem autorização de contato. Não há referência de ontem com essa mesma contagem para afirmar variação. Os ativos seguem is_premium=true e validade nula ou futura; os 24 datados mais um sem validade fecham os 25. A regra do dashboard não exige is_active; não confundir acesso de assinatura com elegibilidade operacional para envio.

### Registros financeiros por natureza

| Natureza | Eventos históricos | Valor positivo histórico | Eventos de novembro | Valor positivo em novembro |
| --- | ---: | ---: | ---: | ---: |
| Compra inicial | 181 | R$ 2.929,44 | 19 | R$ 304,78 |
| Renovação | 21 | R$ 443,19 | 8 | R$ 190,67 |
| Total | 202 | R$ 3.372,63 | 27 | R$ 495,45 |

As oito renovações de novembro pertencem a seis contas distintas. Os 20 eventos iniciais históricos sem valor positivo continuam na contagem de eventos, mas não na soma de valores positivos. Não foram reabertas as investigações individuais já concluídas ontem. Novembro considera created_at desde 01/11 00:00 UTC até a consulta de hoje; os meses anteriores permanecem no histórico de evidência.

| Fonte e plataforma | Eventos históricos | Valor positivo histórico | Eventos de novembro | Valor positivo em novembro |
| --- | ---: | ---: | ---: | ---: |
| pix / manual | 146 | R$ 2.700,24 | 14 | R$ 315,88 |
| stripe / card | 38 | R$ 404,19 | 12 | R$ 164,67 |
| app_sync / iOS | 17 | R$ 253,30 | 1 | R$ 14,90 |
| app_sync / Android | 1 | R$ 14,90 | 0 | R$ 0,00 |
| Total | 202 | R$ 3.372,63 | 27 | R$ 495,45 |

Tipos considerados: INITIAL_PURCHASE, RENEWAL, UNCANCELLATION, PRODUCT_CHANGE e NON_RENEWING_PURCHASE; somente os dois primeiros têm linhas nesta extração. Eventos de expiração não são receitas. Não foram somados pedidos das confeitarias, compras avulsas ou valores de outras moedas.

**Limite financeiro:** são valores registrados e podem conter backfills estimados identificados ontem em migrate.ts (preço fixo ou vínculo temporal, sem proveniência por linha). app_sync não confirma recebimento da loja. Nenhum valor aqui comprova repasse líquido, lucro ou MRR contratual. Sem extratos de provedor/despesas, essas apurações continuam não realizadas; ausência de dados não foi convertida em zero.

## Resultado de cobranças: fila de checagem priorizada

| Ordem | Casos encontrados hoje | Checagem concreta antes de eventual contato | Responsável e conclusão |
| --- | --- | --- | --- |
| 1 | Um Premium/card, vencimento UTC em 25/11 | Verificar estado atual, horário local, renovação automática/cancelamento e pagamento posterior no canal Stripe; excluir disputa e pagamento informado. Não concluir falha só porque a validade é hoje. | Cobranças + Financeiro: classificar como aguardar ciclo automático, regularização em análise ou elegível para orientação autorizada. |
| 2 | Um Master/pix, vencimento UTC em 26/11 | Conferir canal e recorrência efetivos, confirmação posterior e possível divergência financeira antes de orientar renovação. Não assumir que todo PIX é manual. | Financeiro + Cobranças: confirmar status e canal, sem criar cobrança ou alterar acesso. |
| 3 | Um Premium/card em 27/11 e um Premium/iOS em 30/11, datas UTC | Consultar o gerenciamento original e impedir pagamento duplicado ou troca de canal presumida. Caso haja contestação ou pagamento informado, pausar o contato. | Cobranças: registrar decisão por canal e só preparar texto individual após validação atual. |

As quatro contas têm **whatsapp_marketing_opt_in=false**. Não foram selecionadas como público liberado para marketing nem enviadas mensagens. Recusa, incidente, contestação e autorização de comunicação operacional precisam de verificação própria; a flag não resolve toda essa análise. Expirar não é dívida e vencimentos UTC não substituem conferir o horário local do acesso. Nenhuma lista de destinatários foi exportada.

## Fontes, testes e limites

- Fonte de hoje: `financeiro-snapshot-agregado.json`, gerado por SELECTs sobre users e premium_events; regras conferidas em `backend/src/presentation/controllers/AdminController.ts` (getSubscriptionDashboard).
- Comparação: `../../operacao/2026-11-24-assinaturas-banco.json`. Limites e backfill: `../../FINAL-FINANCEIRO.md` e `backend/src/infrastructure/database/migrate.ts`.
- Testes executados em Node: soma histórica por tipos = fontes = meses = **337.263 centavos e 202 eventos**; novembro por tipos = fontes = **49.545 centavos e 27 eventos**; grupos de planos = 25; grupos de expiração = quatro; renovações do mês conferem com resumo de renovação; todas as linhas financeiras são BRL; comparação em centavos confirma +3.798 e dois eventos. Resultado **PASS**, registrado em `financeiro-verificacoes.json`.
- São validações de consistência agregada, não testes em dispositivo, conciliação de extrato nem comprovação do estado financeiro do provedor. A transação de leitura foi encerrada com ROLLBACK. Nenhuma transação financeira, publicação, envio ou alteração foi realizada.
