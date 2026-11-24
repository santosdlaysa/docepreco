# Demandas do time DocePreço

Criado em 24/11/2026. Primeira rodada de trabalho proposta: ajudar usuários a chegar à primeira precificação, melhorar conversão e organizar suporte e recebíveis.

Atualização em 24/11/2026: entregas locais executadas e verificadas; consulte entregas/2026-11-24-relatorio-time.md. Operação externa não iniciada; conciliação real aguardando dados. P1 = iniciar primeiro; P2 = iniciar após as dependências indicadas. A ordem abaixo é um plano de execução, sem agendamentos automáticos ou prazos prometidos. Metas numéricas de resultado serão propostas após levantar uma linha de base atual.

## Quadro inicial

| ID | Responsável | Demanda | Prioridade | Estado | Dependência |
| --- | --- | --- | --- | --- | --- |
| DP-001 | Coordenador | Organizar a rodada e validar fontes comuns | P1 | Material concluído | Nenhuma |
| DP-002 | Marketing | Planejar ativação até a primeira receita | P1 | Material concluído | DP-001 para consolidar briefing |
| DP-003 | Conteúdo | Preparar sete conteúdos e um tutorial inicial | P2 | Material concluído | DP-002 para finalizar calendário |
| DP-004 | Copy | Escrever mensagens para cinco etapas da jornada | P2 | Material concluído | DP-002 para finalizar mensagens |
| DP-005 | Atendimento | Criar respostas e triagem para dez situações | P1 | Material concluído | Nenhuma |
| DP-006 | Comercial | Preparar roteiro de venda por necessidade | P2 | Material concluído | DP-001 para validar planos; DP-004 para alinhar textos |
| DP-007 | Suporte | Preparar diagnóstico dos principais tipos de falha | P1 | Material concluído | Nenhuma |
| DP-008 | Financeiro | Estruturar conciliação e relatório de assinaturas | P1 | Modelo concluído; análise aguardando dados | Dados atuais para calcular valores reais |
| DP-009 | Cobranças | Preparar régua de lembretes e recuperação | P2 | Material concluído | DP-008 para validar regras e divergências |

## DP-001 — Coordenador: organizar a rodada

**Objetivo:** fornecer um briefing único para o time, evitando informações conflitantes sobre o produto.

**Trabalho:** revisar README, BASE.md, campanhas existentes e referências dos planos. Montar uma ficha com público, proposta, funcionalidades verificadas no código, dados históricos, dados atuais disponíveis e lacunas. Localizar as fontes de preço, limites, links oficiais e políticas, sem assumir que conteúdo local prova disponibilidade em produção. Definir ordem de execução e revisar as entregas finais.

**Entrega:** `entregas/DP-001-briefing.md`, com fontes e checklist de revisão do time.

**Concluída quando:** todas as nove demandas tiverem responsável, dependências e critério de aceite; fatos verificados e pendências estiverem separados; nenhum preço ou número histórico for apresentado como atual.

**Indicador:** demandas concluídas/9 e quantidade de pendências essenciais sem responsável.

## DP-002 — Marketing: ativar quem ainda não começou

**Objetivo:** planejar um experimento para levar usuários cadastrados até a primeira receita precificada.

**Trabalho:** definir elegibilidade do público, proposta de ajuda, canal, sequência de três contatos e condição de saída após ativação ou recusa. Usar como hipótese inicial que parte dos usuários precisa de orientação; não tratar essa hipótese como diagnóstico comprovado. Especificar como medir primeira receita, janela de observação e comparação com a linha de base. Verificar se os eventos necessários existem; listar lacunas sem implementar rastreamento por conta própria.

**Entrega:** `entregas/DP-002-campanha-ativacao.md`, com briefing para conteúdo e copy, proposta de teste e regra para evitar contatos duplicados entre áreas.

**Concluída quando:** público, sequência, ação, exclusões, medição e dependências para execução estiverem definidos, sem exigir lista real de clientes para produzir o plano.

**Indicador:** usuários elegíveis que criaram a primeira receita / usuários elegíveis do grupo, dentro da janela definida. Informar separadamente alcance e respostas.

## DP-003 — Conteúdo: ensinar o primeiro resultado

**Objetivo:** produzir materiais educativos ligados à campanha de ativação.

**Trabalho:** preparar sete conteúdos: custo dos ingredientes, rendimento, custos adicionais, margem, atualização de valores, organização de vendas e rotina de uso do app. Incluir pelo menos um carrossel e dois roteiros curtos de vídeo. Produzir também um tutorial textual da primeira receita, com navegação verificada no código ou evidência atual. Não inventar telas ou criar imagens como se fossem capturas reais.

**Entrega:** `entregas/DP-003-conteudos.md`, com calendário sugerido, textos, cenas, chamada para ação e instruções visuais.

**Concluída quando:** houver sete peças redigidas e um tutorial executável, com caminhos de interface confirmados ou lacunas claramente identificadas.

**Indicador:** acesso ao tutorial e ativação posterior, se houver medição disponível; salvamentos e respostas como indicadores auxiliares.

## DP-004 — Copy: mensagens por etapa da jornada

**Objetivo:** preparar textos curtos e coerentes para cada situação do usuário.

**Trabalho:** escrever duas versões de WhatsApp para cada uma das cinco situações: boas-vindas, cadastro sem uso, primeira receita concluída, interesse em plano e retorno após inatividade. Criar três notificações de ativação, com título, corpo e contagem de caracteres. A sequência e o público seguem DP-002; a seleção do plano cabe ao comercial. Sem criar ofertas, urgência ou links não verificados.

**Entrega:** `entregas/DP-004-mensagens.md`, com dez mensagens e três notificações. Colocar pendências de links/benefícios fora dos textos prontos; usar campos identificados somente em modelos.

**Concluída quando:** cada texto tiver público e ação claros, sem promessas não comprovadas, preços presumidos ou mensagens que aleguem envio realizado.

**Indicador:** respostas e ações por variante, mantendo o mesmo público e período para comparação.

## DP-005 — Atendimento: respostas e encaminhamentos

**Objetivo:** reduzir dúvidas repetidas e orientar o cliente sem desconsiderar relatos de dificuldade.

**Trabalho:** criar respostas para dez situações: não sabe começar; dúvida de ingrediente; dúvida de rendimento; dúvida de plano; quer tutorial; senha recusada; recuperação de senha não chega; app fecha; valor de receita inesperado; pagamento sem acesso liberado. Nos cinco últimos casos, preparar triagem e encaminhamento, sem afirmar diagnóstico técnico ou financeiro. Usar dúvidas conhecidas como cenários, sem afirmar que há incidentes atuais confirmados.

**Entrega:** `entregas/DP-005-atendimento.md`, com resposta externa, informação mínima necessária e área responsável pelo próximo passo.

**Concluída quando:** houver dez respostas prontas; problemas técnicos forem encaminhados ao suporte e pagamentos ao financeiro; nenhuma resposta solicitar senha ou dados de cartão.

**Indicador:** resolução no primeiro atendimento, reabertura e tempo até encaminhamento, quando houver registros.

## DP-006 — Comercial: vender conforme a necessidade

**Objetivo:** preparar um processo simples para orientar interessados na escolha de plano.

**Trabalho:** montar até três perguntas de diagnóstico, uma matriz necessidade → benefício verificado → plano e roteiros para usuário Free, interessado na loja online e ex-assinante. Preparar respostas para quatro objeções: falta de tempo, preço, dificuldade de uso e dúvida sobre utilidade. Incluir condições para encerrar o contato e para encaminhar problema ao suporte. Aproveitar DP-004 sem duplicar sua sequência de ativação.

**Entrega:** `entregas/DP-006-comercial.md`, com roteiro de conversa, demonstração curta e acompanhamento sugerido.

**Concluída quando:** recomendações tiverem fonte de benefício atual; campos sem validação estiverem pendentes; não houver desconto inventado nem pressão para comprar após relato de erro.

**Indicador:** assinaturas confirmadas / interessados qualificados, discriminando plano e período.

## DP-007 — Suporte: organizar investigação de falhas

**Objetivo:** estabelecer triagem técnica reproduzível para acesso, encerramento do app e cálculos inesperados.

**Trabalho:** inspecionar caminhos relevantes do código e criar três roteiros: login/recuperação, app que fecha e atualização de custo/preço. Para cada roteiro, informar evidências mínimas, hipóteses, teste local seguro e prioridade por impacto. Criar modelo de incidente com esperado/observado, plataforma, versão, reprodução e dados mascarados. Diferenciar margem e markup ao investigar cálculo, conforme implementação encontrada.

**Entrega:** `entregas/DP-007-suporte.md`, com referências a arquivos reais e testes propostos ou executados claramente separados.

**Concluída quando:** os três roteiros e o modelo estiverem prontos, sem concluir que incidentes foram corrigidos apenas por análise de código. Não acessar produção nem alterar dados para esta demanda.

**Indicador:** relatos com evidência suficiente, tempo de triagem e reincidência por tipo de falha.

## DP-008 — Financeiro: preparar conciliação de assinaturas

**Objetivo:** organizar receita, taxas e repasses do DocePreço sem confundir com vendas das confeitarias.

**Trabalho:** mapear fontes de assinatura e recebimento documentadas. Criar modelo com período, provedor, identificador mascarado, bruto, taxas, reembolsos, líquido, status e datas de pagamento/repasse. Definir deduplicação, moeda e fuso. Para a primeira análise real, propor 01/11/2026 a 23/11/2026, dias completos no fuso America/Boa_Vista, e listar exportações mínimas necessárias. Não executar scripts de conexão a produção para obter esses dados.

**Entrega:** `entregas/DP-008-financeiro.md`, com modelo de conciliação, definições das métricas e pendências. Preencher números reais apenas se houver dados autorizados suficientes.

**Concluída quando:** modelo e regras estiverem prontos. A análise real fica separadamente marcada como aguardando dados se faltarem extratos; não registrar faturamento zero nem conciliação concluída por ausência de dados.

**Indicador:** diferença não conciliada por provedor e percentual de transações conciliadas, calculados somente após receber dados.

## DP-009 — Cobranças: preparar lembretes adequados ao status

**Objetivo:** facilitar renovação e regularização sem cobrar quem já pagou ou cancelou.

**Trabalho:** preparar cinco modelos: lembrete de vencimento confirmado, vencimento no dia, falha de renovação, convite após expiração e resposta a pagamento informado. Criar matriz de decisão por status e canal de contratação. Descrever verificação de pagamento antes de cada envio, interrupção por contestação/recusa, identificação de duplicidade e encaminhamento ao financeiro. Não tratar expiração como dívida nem definir vencimento universal para todos.

**Entrega:** `entregas/DP-009-cobrancas.md`, com cinco textos e regras de elegibilidade, exclusão e revisão.

**Concluída quando:** cada modelo tiver condição de uso verificável; divergências interromperem cobrança; links e valores não confirmados estiverem identificados como pendências internas. Nenhum débito ou envio deve ser iniciado por esta demanda.

**Indicador:** renovações confirmadas após contato / contatos elegíveis efetivamente enviados, com janela definida; acompanhar reclamações e duplicidades separadamente. Sem envio, o indicador permanece não medido.

## Execução e revisão

Para iniciar uma demanda, peça, por exemplo: “Execute a DP-005”. Para uma rodada completa: “Coordenador, execute as demandas que podem avançar com os arquivos disponíveis”.

Ao começar, leia BASE.md e o perfil responsável. Atualize o estado para Em andamento, Em revisão, Concluída ou Aguardando dados, conforme evidência. Cada entrega deve incluir fontes consultadas, pendências e critério de aceite conferido. O coordenador consolida o quadro para evitar edições concorrentes. Concluir um material não significa publicar, enviar ou medir seu resultado.

