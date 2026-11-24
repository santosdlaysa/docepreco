# Exportações para conciliação e revisão de cobranças

Preparado em 24/11/2026. Os CSVs são materiais de operação manual, não importadores do produto nem autorização de envio. Não há dados reais preenchidos.

## Arquivos entregues

- `conciliacao-modelo.csv`: somente cabeçalhos, sem linhas artificiais tratadas como clientes. Uma linha por transação financeira consolidada, não por webhook.
- `exemplos-sinteticos-conciliacao.csv`: quatro casos fictícios com prefixo TESTE; nunca importar no produto. O caso webhook_duplicado deve ser excluído da soma após deduplicar por provedor + transacao. Os exemplos podem repetir dados justamente para testar essa proteção.
- `cobrancas.csv`: cinco textos extraídos da entrega DP-009 e regras de elegibilidade. Campos de nome/data ainda são modelos. Arquivo não contém destinatários e não deve ser enviado diretamente a uma API de disparo.

CSV separado por vírgula, UTF-8, valores monetários em centavos inteiros e datas ISO 8601 com offset. Campos desconhecidos ficam vazios e são dados insuficientes, não zero. Diferença = repasse atribuído − líquido esperado. Líquido esperado = bruto − taxas − reembolsos − contestações + ajustes credores. Só preencher com componentes completos; taxas de contestação adicionais pertencem às taxas, sem dupla contagem.

## Fontes privadas mínimas

O resultado de assinaturas mostrado no painel administrativo pode ser analisado separadamente quando houver leitura autorizada: registrar data/hora da consulta, filtros, período, indicadores exatamente como exibidos e definições disponíveis. Esse retrato não comprova repasse bancário. A ausência de extratos impede a conciliação de caixa, mas não impede relatar os números efetivamente observados no painel. Não inferir líquido recebido ou faturamento conciliado a partir de quantidade de assinantes.

Os nomes abaixo são o contrato de normalização proposto, não uma afirmação de que cada provedor exporta cabeçalhos idênticos. Fazer correspondência dos campos originais e conservar fonte e data de extração.

| Exportação | Campos mínimos exatos no arquivo normalizado |
| --- | --- |
| Transações por provedor | provedor, canal, transacao_id, assinatura_id, conta_referencia_pseudonima, natureza, plano, moeda, bruto_centavos, taxas_centavos, status_financeiro, criado_em, pago_em, competencia_inicio, competencia_fim, ambiente |
| Ajustes/reembolsos/contestações | provedor, ajuste_id, transacao_id, tipo_ajuste, valor_centavos, moeda, status_ajuste, efetivado_em |
| Lotes de repasse | provedor, lote_id, moeda, repasse_liquido_centavos, repassado_em, status_repasse |
| Composição dos lotes | provedor, lote_id, transacao_id, ajuste_id, natureza_item, valor_liquido_centavos |
| Estado das assinaturas | conta_referencia_pseudonima, assinatura_id, provedor, canal, plano, status_assinatura, renovacao_automatica, validade_ate, cancelamento_solicitado_em, atualizado_em |
| Extrato de caixa | conta_financeira_pseudonima, movimento_id, lote_id, moeda, ocorrido_em, valor_assinado_centavos, saldo_inicial_centavos, saldo_final_centavos |
| Controle privado de contato | conta_referencia_pseudonima, ciclo_referencia, finalidade, recusa_contato, disputa_aberta, pagamento_informado, ultimo_contato_em, responsavel_fluxo, status_envio |

Destinatário/nome não são necessários para a conciliação. Se houver autorização futura de envio, relacionar destinatário em armazenamento privado separado, nunca neste repositório. IDs financeiros completos também permanecem em fontes privadas autorizadas; o modelo público usa id_mascarado e uma referência opaca para o vínculo privado. Pseudônimos devem ser consistentes entre exportações para permitir o cruzamento e não podem ser apenas os últimos dígitos quando isso gerar colisão.

Recorte de pagamentos: de 01/11/2026 00:00 até 24/11/2026 00:00 exclusivo no fuso America/Boa_Vista, UTC−04. Recorte de caixa usa data do repasse; pagamentos de outros meses que compõem lotes do recorte precisam ser incluídos como vínculos de conciliação e não como nova receita do período. Exportar ajustes e composição necessários mesmo quando a transação original está fora do recorte. Apple/Google: incluir relatórios financeiros de vendas, comissões, ajustes, moedas e repasses; RevenueCat é fonte complementar de vínculo/estado, não outra entrada de dinheiro.

## Aplicação das regras

Excluir sandbox, agrupar eventos repetidos por transação original, relacionar ajustes e conciliar por moeda e provedor. Compras avulsas e taxas de plataforma ficam em categorias separadas de assinaturas. Não somar dinheiro das confeitarias como receita DocePreço. Repasse em lote exige composição; se ausente, marcar aguardando dados em vez de distribuir arbitrariamente.

Antes de contato: reconsultar status atual, recusa, cancelamento, disputa, pagamento posterior e outro fluxo ativo. Cobrança automática vigente não gera solicitação manual de novo pagamento. Expiração gera convite de retorno, não afirmação de dívida. Pagamento informado pausa cobrança e encaminha financeiro. As condições estão na matriz da entrega DP-009; a coluna CSV é um resumo, não motor de decisão automático.

## Verificações e limites

Verificações locais: leitura dos CSVs, roundtrip de exportação/importação em memória, contagem dos cinco modelos, quatro casos sintéticos, validação dos cálculos em centavos, deduplicação do caso repetido e zero linhas no modelo vazio. Referências: DP-008-financeiro.md e DP-009-cobrancas.md no diretório superior. Não houve teste de importação no produto, execução de cobrança, envio ou consulta de produção. A conciliação real permanece aguardando exportações.
