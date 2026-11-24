# DP-008 — Financeiro

Entrega de 24/11/2026. Modelo concluído; conciliação real aguardando extratos. Valores reais não apurados, sem atribuir zero à ausência de dados.

## Fontes conferidas

- `README.md`: assinaturas em múltiplos canais.
- `backend/src/presentation/controllers/StripeController.ts`: assinatura recorrente, confirmação por invoice.paid e tratamento de cancelamento programado.
- `backend/src/infrastructure/services/mercadoPagoService.ts`: external_reference e consulta de status de pagamento.
- `backend/src/infrastructure/services/revenueCatService.ts`: associação APP_STORE/PLAY_STORE às plataformas iOS/Android. RevenueCat representa integração/estado de acesso; não deve ser somado como outro recebimento além do pagamento da loja.
- `docs/RECEBIMENTOS-MERCADO-PAGO.md`: checkout de pedidos das confeitarias e taxa da plataforma. Esse documento não é um extrato de assinaturas; produtos e entrega pertencem à loja, não ao DocePreço.
- `docs/metricas-negocio.md`: definições históricas, não saldo atual.

## Período e modelo

Primeiro recorte proposto: 01/11/2026 00:00 inclusive a 24/11/2026 00:00 exclusive, America/Boa_Vista (UTC−04:00), equivalente a 01/11 04:00 UTC até 24/11 04:00 UTC. Separar moedas; apresentar BRL apenas quando o registro for BRL ou houver conversão documentada.

| Campo | Regra |
| --- | --- |
| Período e origem | Arquivo/provedor, data de extração e versão |
| Natureza | Assinatura; compra avulsa; taxa de plataforma; ajuste. Não misturar GMV |
| Provedor e canal | Stripe; Mercado Pago; App Store; Google Play |
| ID mascarado | Referência pública minimizada; vínculo completo fica somente em fonte privada autorizada |
| Chave de conciliação | Provedor + ID financeiro original em ambiente privado; não usar somente últimos dígitos |
| Plano e competência | Plano verificado, início/fim cobertos pela cobrança |
| Moeda e bruto | Valor original e unidade monetária |
| Taxas | Taxas efetivas documentadas; ausentes = não informadas |
| Reembolso/contestação | Valor e sinal do ajuste, com vínculo à transação original |
| Líquido esperado | Bruto − taxas − reembolsos − débitos de contestação + ajustes credores |
| Estado financeiro | Previsto, pendente, aprovado, liquidado, reembolsado, contestado |
| Data de pagamento | Confirmação financeira, sem confundir com criação do cadastro |
| Data de repasse e lote | Crédito efetivo identificado no extrato |
| Repasse líquido confirmado | Apenas crédito comprovado; lotes podem agregar vários pagamentos |
| Diferença | Repasse atribuído − líquido esperado; não calculada quando faltam componentes |
| Estado de conciliação | Conciliado, divergente, aguardando repasse ou dados insuficientes |

Deduplicar eventos pelo mesmo pagamento original: fatura, webhook, payment intent e entitlement não são quatro receitas. Reembolso é movimento vinculado, não remoção silenciosa do pagamento original. Confirmar tabela de correspondência de IDs antes de unir relatórios. Créditos de lote devem reconciliar soma de pagamentos, ajustes, taxas, reservas e variação cambial documentada; não forçar correspondência um a um.

Extrato de caixa: filtrar data de repasse. Relatório de pagamentos: filtrar data de aprovação. Competência: usar período coberto. Relatórios devem nomear sua base temporal, pois os totais não precisam coincidir no mesmo mês.

## Dados necessários

Exportações privadas de transações, taxas, reembolsos, contestações e repasses de cada provedor usado no período; relatórios financeiros de Apple/Google quando aplicável; exportação minimizada das assinaturas para relacionar plano, canal, validade e identificador de origem. Saldo inicial, créditos e débitos do extrato para fechar caixa. Não solicitar senha ou acesso direto como condição para preparar o modelo. Não colocar extratos ou identificação de clientes no Git.

## Métricas

- Receita bruta de assinaturas: soma de pagamentos de assinatura confirmados no recorte, excluindo pendentes, sandbox e compras avulsas.
- Líquido: fórmula acima, com ajustes identificados; não equivale a lucro após despesas operacionais.
- MRR proposto: valor recorrente contratual mensal normalizado das assinaturas pagas ativas na data de corte; anual dividido por 12, trimestral por 3. Excluir testes, Free, compras avulsas e expiradas. Cancelamento programado ainda vigente deve ser exibido separadamente. Descontos recorrentes entram no valor contratual; declarar tratamento de promoções temporárias. MRR não é caixa recebido.
- Percentual conciliado: transações com conciliação concluída / transações elegíveis, excluindo duplicatas técnicas e informando o denominador.
- Diferença não conciliada: soma das diferenças calculáveis por moeda/provedor; listar à parte registros sem dados, sem compensar divergências de origens diferentes.
- Falhas de renovação: tentativas de renovação falhas / tentativas de renovação elegíveis. Não denominar automaticamente dívida/inadimplência exigível.

## Testes e aceite

Exemplo sintético, sem preços de plano: bruto 10.000 centavos, taxa 500, reembolso 2.000 → líquido esperado 7.500. Repasse atribuído 7.500 → diferença 0. Mesmo webhook repetido mantém uma transação. Registro RevenueCat associado à transação Apple não gera receita adicional. GMV de pedido 20.000 e taxa plataforma 100: apenas 100 é candidato a receita da plataforma, sujeito a confirmação e ajustes; 20.000 não é assinatura.

Verificados localmente: referências existem; aritmética em centavos; nove campos financeiros essenciais cobertos; ausência de acesso à produção e de transações reais. Não foram testadas integrações externas nem preenchidos indicadores reais. Aceite do modelo: atendido. Conciliação real: aguardando dados, responsabilidade Financeiro/Laysa pelo fornecimento das exportações.
