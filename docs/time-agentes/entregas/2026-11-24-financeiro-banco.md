# Resultado de assinaturas registrado no banco

Consulta agregada recebida em 24/11/2026 às 12:45:27 UTC (08:45:27 em Boa Vista). Fonte: `operacao/2026-11-24-assinaturas-banco.json`; contexto da extração declara sessão somente leitura e fuso do banco UTC. Esta etapa leu apenas o JSON local, sem nova conexão ao banco.

## Retrato atual

| Indicador | Resultado |
| --- | ---: |
| Contas cadastradas | 2.140 |
| Assinantes ativos conforme critério administrativo | 23 |
| Premium | 16 |
| Master | 7 |
| Ativos com vencimento datado | 22 |
| Ativo sem vencimento | 1 |
| Contas com expiração nos próximos sete dias | 4 |
| Ativos administrativos / contas cadastradas | 1,07% |

O registro sem vencimento precisa de revisão de origem e regra comercial; não implica erro nem assinatura efetivamente paga. A proporção de ativos sobre contas é um retrato de estoque, não taxa de conversão de uma campanha.

## Histórico mensal em BRL

Valores abaixo são a soma dos valores positivos registrados em eventos de compra inicial/renovação. Os totais de eventos incluem registros sem valor positivo. Competência mensal conforme UTC; novembro está parcial até a consulta, não corresponde a novembro fechado nem ao recorte de 01 a 23 sugerido no modelo anterior.

| Mês UTC | Eventos de compra/renovação | Valor positivo registrado |
| --- | ---: | ---: |
| Maio/2026 | 3 | R$ 34,90 |
| Junho/2026 | 23 | R$ 266,44 |
| Julho/2026 | 38 | R$ 559,29 |
| Agosto/2026 | 29 | R$ 561,00 |
| Setembro/2026 | 44 | R$ 719,03 |
| Outubro/2026 | 38 | R$ 736,52 |
| Novembro/2026, parcial | 25 | R$ 457,47 |
| Total observado | 200 | R$ 3.334,65 |

## Tipos e fontes dos registros

179 eventos INITIAL_PURCHASE somam R$ 2.891,46 em valores positivos; 20 desses eventos têm valor ausente, zero ou negativo e não entram nessa soma. Os 21 eventos RENEWAL somam R$ 443,19; nenhum está sem valor positivo. São 180 eventos com valor positivo entre 200 eventos de compra/renovação. Os 170 EXPIRED_BY_CRON são eventos de expiração, não novas vendas; foram excluídos dos totais financeiros.

| Fonte registrada | Plataforma | Eventos | Valor positivo registrado |
| --- | --- | ---: | ---: |
| pix | manual / PIX | 144 | R$ 2.662,26 |
| stripe | card / STRIPE | 38 | R$ 404,19 |
| app_sync | iOS, loja não informada | 17 | R$ 253,30 |
| app_sync | Android, loja não informada | 1 | R$ 14,90 |
| Total | Todas | 200 | R$ 3.334,65 |

## Interpretação e próximos passos

R$ 3.334,65 é receita positiva registrada nos eventos observados, não repasse comprovado, líquido bancário ou lucro. A consulta agregada não demonstra taxas, reembolsos, contestações nem deduplicação entre integrações. `app_sync` não comprova confirmação financeira da App Store/Google Play; o campo de loja está ausente nesses registros. Não é possível calcular MRR contratual ou conciliar recebíveis somente com esses agregados.

Prioridades: Financeiro verificar os 20 registros iniciais sem valor positivo e a origem do ativo sem vencimento; conciliar fontes com relatórios financeiros dos provedores antes de concluir recebimento; Cobranças revisar individualmente as quatro expirações futuras, respeitando recorrência, pagamento posterior e recusa, antes de qualquer mensagem. Não há autorização implícita para cobrar por constar neste relatório.

## Testes executados

PowerShell leu o JSON e validou: INITIAL_PURCHASE + RENEWAL = 200 eventos; soma mensal = soma por fontes = soma dos tipos = 333.465 centavos. As três contagens também coincidem em 200. Premium 16 + Master 7 = 23; datados 22 + sem vencimento 1 = 23; 200 − 20 = 180 eventos com valor positivo. Resultado: PASS.

Limites: consistência aritmética agregada não prova completude, correção dos estados, liquidação, ausência de duplicidade ou funcionamento em dispositivo. Não foram realizados envios, transações, nova consulta à produção ou testes de aplicativos nesta etapa.
