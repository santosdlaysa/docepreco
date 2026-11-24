# DP-006 — Comercial

Preparado em 24/11/2026. Roteiros prontos para adaptação após validação dos planos vigentes; não houve contato externo.

## Diagnóstico: até três perguntas

1. Qual parte da sua rotina você mais precisa organizar hoje: precificação, vendas ou encomendas online?
2. Você já cadastrou e precificou uma receita no DocePreço?
3. O que falta para você decidir se uma assinatura faz sentido?

## Necessidade e recomendação

| Necessidade | Benefício encontrado na documentação local | Encaminhamento de plano |
| --- | --- | --- |
| Experimentar o fluxo básico | Cadastro de ingredientes e receitas | Free, com limites atuais a consultar |
| Ampliar gestão e acompanhar vendas | Precificação, relatórios e vendas descritos no README | Premium como candidato; confirmar habilitação e limites atuais |
| Expor catálogo e receber pedidos online | Loja online e pedidos descritos no README | Master como candidato; confirmar configuração vigente |

Fonte: `README.md`, seção Planos, que determina configuração dinâmica no painel; `mobile/src/presentation/context/PremiumContext.tsx` distingue validade e tiers. Isso comprova estrutura local, não preço ou oferta em produção. Antes de apresentar condições, consultar configuração vigente em `GET /api/admin/settings/plans` por acesso autorizado. Não inserir valores históricos ou links presumidos.

## Roteiros

### Usuário Free com interesse confirmado

“Você comentou que quer organizar melhor sua rotina. Qual tarefa está tomando mais tempo hoje? Posso mostrar como o DocePreço atende essa necessidade e conferir qual plano faz sentido para você.”

Próximo passo: demonstrar a tarefa escolhida e, após validar plano/preço/link oficial, apresentar as condições. Se ainda não começou, retornar ao atendimento e à campanha DP-002, sem duplicar a sequência DP-004.

### Interessado na loja online

“Você quer deixar seu catálogo disponível para receber encomendas? Posso te mostrar o fluxo da loja online e conferir as condições do plano que inclui esse recurso.”

Próximo passo: demonstrar catálogo e pedido em ambiente de demonstração autorizado, sem criar pedido real. Só recomendar Master após confirmar benefícios vigentes.

### Ex-assinante

“Você já usou o DocePreço e gostaria de entender o que faria sentido para sua rotina hoje? Se quiser, me conte o que motivou a saída para eu orientar melhor.”

Próximo passo: entender motivo; se foi falha, encaminhar ao suporte; se foi adequação, demonstrar tarefa relevante e validar condições atuais. Não prometer desconto ou reativação gratuita.

## Demonstração curta proposta

Em uma conta de demonstração autorizada, mostrar ingrediente com preço e quantidade de compra; receita com quantidade usada, rendimento e custos; resultado do cálculo; recurso adicional que atende à necessidade declarada. Explicar que o percentual de `profitMargin` no cálculo local é acréscimo sobre custo. Não chamar de margem líquida. Para loja, mostrar catálogo e fluxo de encomenda sem concluir pedido real. Validar navegação na versão disponível antes da apresentação.

## Quatro objeções

| Objeção | Resposta pronta |
| --- | --- |
| Falta de tempo | Podemos começar por uma receita que você já faz, em uma orientação curta. Quer que eu te ajude nessa primeira etapa? |
| Preço | Entendo. Vamos conferir os recursos e o valor atual para você avaliar se atendem ao que precisa. Qual tarefa você espera resolver com a assinatura? |
| Dificuldade de uso | Posso te orientar em uma tarefa de cada vez. Em qual etapa você teve dificuldade? Se houve erro no app, vamos encaminhar ao suporte antes de falar em assinatura. |
| Dúvida sobre utilidade | Podemos usar uma receita sua como exemplo e conferir o custo com os dados cadastrados. Assim você avalia a utilidade na sua rotina. |

## Acompanhamento

Perguntar ao interessado se deseja retomar a conversa e combinar o momento. Registrar estágio e responsável em controle autorizado; não inserir dados de clientes neste arquivo. Encerrar diante de recusa, pedido para não receber contato ou falta de autorização para acompanhamento. Suspender venda quando houver erro ou divergência de pagamento.

Métrica proposta: assinaturas confirmadas / interessados qualificados no mesmo período, discriminando plano e origem. Definir interessado qualificado como pessoa que declarou necessidade atendida, recebeu condições verificadas e aceitou conversar; não contar simples cadastros. Não medido nesta entrega.

## Verificação

Conferidos: três perguntas, três roteiros, quatro objeções, matriz, demonstração e critérios de encerramento. Não há preço, desconto ou link inventado. Lidos DP-001 e DP-004: as duas variantes de interesse em plano fazem diagnóstico antes de recomendar, coerente com este roteiro. DP-004 é referência da ativação; este documento trata apenas da conversa após interesse, evitando disparos sobrepostos. Pendências: configuração publicada dos planos, link oficial por canal e validação visual da demonstração.
