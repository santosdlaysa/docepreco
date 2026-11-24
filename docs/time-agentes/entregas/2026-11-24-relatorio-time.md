# Relatório do time — 24/11/2026

As nove demandas tiveram suas entregas locais produzidas e verificadas. Campanhas não foram publicadas e mensagens não foram enviadas. A conciliação real aguarda dados financeiros. Nenhum código de produto foi alterado.

## Entregas

| Demanda | Resultado | Arquivo |
| --- | --- | --- |
| Coordenador DP-001 | Briefing, fontes e responsáveis pelas pendências | [Briefing](DP-001-briefing.md) |
| Marketing DP-002 | Campanha de três contatos, elegibilidade e proposta de teste com controle | [Campanha](DP-002-campanha-ativacao.md) |
| Conteúdo DP-003 | Sete peças, com carrossel, dois Reels e tutorial adicional | [Conteúdos](DP-003-conteudos.md) |
| Copy DP-004 | Dez mensagens e três notificações | [Mensagens](DP-004-mensagens.md) |
| Atendimento DP-005 | Dez respostas com triagem e encaminhamento | [Atendimento](DP-005-atendimento.md) |
| Comercial DP-006 | Diagnóstico, três roteiros e quatro objeções | [Comercial](DP-006-comercial.md) |
| Suporte DP-007 | Três roteiros técnicos, modelo de incidente e testes locais | [Suporte](DP-007-suporte.md) |
| Financeiro DP-008 | Modelo de conciliação, métricas e fontes; análise real aguardando extratos | [Financeiro](DP-008-financeiro.md) |
| Cobranças DP-009 | Cinco modelos e matriz de elegibilidade/suspensão | [Cobranças](DP-009-cobrancas.md) |

## Testes executados

- Especialista de suporte executou em `backend/`: `node node_modules/jest/bin/jest.js --runInBand src/domain/services/recipeCalculator.test.ts src/presentation/controllers/AuthController.test.ts`. Duas suítes, 55 testes aprovados, zero falhas. Dados sintéticos e dependências simuladas; não é teste em produção. A tentativa inicial via npm sofreu EPERM; execução direta do Jest funcionou.
- Coordenação conferiu automaticamente nove arquivos de entrega, dez mensagens A/B, três notificações, sete peças e cinco modelos de cobrança: aprovado.
- Contagens das notificações recalculadas: N1 título/corpo 22/72; N2 17/80; N3 19/66 caracteres, correspondendo ao documento. Não comprova renderização em dispositivos.
- Exemplos aritméticos verificados: custo 40 dividido por 20 = 2; custo 10 acrescido de 50% = 15; bruto 10.000 centavos menos 500 de taxa e 2.000 de reembolso = 7.500.
- Especialistas verificaram referências locais, dez cenários de atendimento, quatro objeções comerciais e oito cenários da matriz de cobrança. Revisão cruzada: comercial recebe interesse declarado e não sobrepõe a sequência de ativação.

## Achados e limites

1. O campo `profitMargin` do calculador implementa acréscimo sobre custo. Não representa margem percentual sobre preço de venda. Conteúdo e suporte explicam a diferença.
2. A documentação de recebimentos Mercado Pago trata também de pedidos das confeitarias e taxa da plataforma. Não somar GMV como receita de assinaturas do DocePreço.
3. Eventos de oferta com origem `first_recipe` não comprovam rastreamento da primeira criação de receita. A medição da campanha precisa de validação adicional.
4. Não foram consultados dados atuais de produção. Não há relatório de faturamento real, confirmação de incidentes atuais nem demonstração de resultado comercial.

## Pendências para operação

| Pendência | Responsável | Efeito |
| --- | --- | --- |
| Conferir preços, benefícios e links atuais | Coordenador/comercial | Finalizar ofertas individualizadas |
| Validar tutorial, telas e destinos na versão publicada | Conteúdo/suporte | Liberar capturas, demonstração e notificações |
| Definir público real, canal autorizado e medição | Marketing | Executar e avaliar campanha |
| Fornecer exportações financeiras do período proposto | Financeiro/Laysa | Calcular receitas, taxas, repasses e divergências reais |
| Revalidar status e canal por assinatura | Cobranças/financeiro | Individualizar lembretes sem duplicar pagamentos |
| Obter evidência e reproduzir crash em build equivalente | Suporte | Diagnosticar relatos específicos de fechamento |

Aceite: 9/9 materiais locais produzidos. Para DP-008, somente o modelo está concluído; conciliação real aguarda dados. Resultados de negócio não medidos. A exigência de testes adequados às entregas foi registrada em AGENTS.md para os próximos trabalhos.
