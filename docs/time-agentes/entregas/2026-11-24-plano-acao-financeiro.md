# Plano de ação financeiro do DocePreço

Preparado em 24/11/2026 com o retrato de 08:45 de Boa Vista (12:45 UTC). Objetivo: distinguir acesso ativo, pagamento confirmado, dinheiro recebido e resultado após despesas. Ordem sugerida, sem agendamento ou movimentação financeira.

| Ordem | Ação concreta | Responsável | Conclusão e validação |
| --- | --- | --- | --- |
| 1 — imediata | Revisar as quatro contas com expiração nos sete dias seguintes ao retrato. Conferir validade atual, canal, renovação automática, pagamento posterior e recusa antes de selecionar lembrete ou convite. | Cobranças + Financeiro | Quatro casos classificados como renovar automaticamente, lembrar, aguardar confirmação ou não contatar, com evidência atual. Não enviar nesta etapa; a lista do retrato precisa de atualização antes do contato. |
| 2 — primeira auditoria | Classificar os 20 eventos INITIAL_PURCHASE sem valor positivo. Relacionar origem e documento financeiro; distinguir ausência de valor, gratuidade/teste, ajuste negativo ou falha de registro somente quando comprovados. Não atribuir preço de tabela retrospectivamente. | Financeiro + Suporte | 20 eventos com motivo comprovado ou pendência explícita, sem duplicação nem alteração de histórico. Conferir que são eventos, não presumir 20 clientes ou 20 dívidas. |
| 3 — em paralelo à auditoria | Investigar o único ativo sem vencimento: origem da concessão, regra de acesso e eventual vínculo financeiro. | Financeiro + Suporte; Laysa decide eventual ajuste | Origem e tratamento documentados. Se faltarem evidências, manter como pendência e não cancelar acesso automaticamente. Conferir 22 datados + 1 sem vencimento = 23 ativos administrativos. |
| 4 — após receber exportações | Conciliar R$ 3.334,65 de valores positivos históricos por origem: PIX R$ 2.662,26; Stripe R$ 404,19; app_sync iOS R$ 253,30; app_sync Android R$ 14,90. Usar modelo e campos mínimos já preparados em operacao/. | Financeiro; Laysa fornece relatórios disponíveis | Cada transação vinculada à fonte, deduplicada e classificada; totais por moeda e origem fecham ou mostram diferença justificada. Separar taxas, reembolsos, contestações, reservas e lotes de repasse. app_sync exige confirmação financeira da loja, não prova recebimento. |
| 5 — após classificar acessos e pagamentos | Separar o quadro de 23 ativos administrativos (16 Premium, 7 Master) dos pagantes efetivamente comprovados. Vincular pagamento ao período de cobertura, incluindo eventual gratuidade ou concessão quando demonstrada. | Financeiro | Lista privada de acessos com classificação e evidência. Quantidade de pagantes e MRR só calculados quando houver informação contratual suficiente; não multiplicar 23 pelo preço atual. Não confundir os 180 eventos históricos positivos com 180 assinantes atuais. |
| 6 — fechamento de novembro | Revisar o período completo e os ajustes após encerramento do mês, usando o mesmo fuso/base de datas. O ponto de partida é R$ 457,47 registrados em 25 eventos de novembro, parcial até 24/11 12:45 UTC. | Financeiro | Mês fechado identificado como tal e separado de pagamentos, competência e repasses. Não concluir queda/crescimento comparando novembro parcial com outubro completo; para comparação antecipada, exigir recortes equivalentes. |
| 7 — antes de apurar lucro | Levantar despesas efetivas do app: infraestrutura, ferramentas/API, tarifas de recebimento, marketing e demais gastos comprovados. Categorias são sugestões de coleta, não despesas encontradas. Separar recorrentes, variáveis e pontuais. | Financeiro; Laysa fornece registros | Despesas categorizadas e vinculadas a comprovantes, com período e moeda. Evitar dupla contagem de taxas já abatidas do líquido. Sem esses dados, lucro e ponto de equilíbrio permanecem não apurados. |

## Entrega final esperada

Um fechamento com quatro blocos separados: acessos ativos; pagamentos de assinatura confirmados; repasses efetivos; receitas menos despesas conforme base declarada. Pendências ficam visíveis por responsável. Correções de dados, concessões, reembolsos e contatos exigem o escopo/autorização correspondente; este plano não os executa.

Próximo insumo mínimo: relatórios privados de transações/ajustes/repasses por provedor e identificação pseudonimizada dos casos a revisar. Consultar `operacao/exportacoes-necessarias.md`; não registrar dados de clientes ou extratos no Git. Os agregados existentes permitem definir prioridades, mas não identificar ou concluir os casos individuais.

## Fontes e verificações

Fontes locais lidas: `../BASE.md`, `../financeiro.md`, `2026-11-24-financeiro-banco.md` e `operacao/2026-11-24-assinaturas-banco.json`. Os dados se referem à consulta registrada, não a uma nova verificação do estado atual.

Testes executados em PowerShell sobre o JSON: soma das fontes = soma dos meses = soma de INITIAL_PURCHASE/RENEWAL = 333.465 centavos; contagens correspondentes = 200 eventos; novembro = 45.747 centavos e 25 eventos; 179 compras iniciais incluem 20 sem valor positivo; 200 − 20 = 180 positivos; 16 + 7 = 23 e 22 + 1 = 23; quatro expirações futuras no retrato. Referências locais conferidas. Resultado: PASS. São verificações aritméticas/documentais, não conciliação, validação de transações nem teste em produção.

Nenhuma nova conexão, cobrança, mensagem, alteração de assinatura ou transação foi realizada nesta entrega.
