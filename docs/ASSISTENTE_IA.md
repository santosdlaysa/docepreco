# Assistente de receitas

Na tela de detalhes de uma receita do aplicativo, a seção Assistente de precificação e vendas permite informar quantidade e desconto, analisar os custos e compartilhar a resposta para revisão. Não aparece no modo demonstração.

## Configuração

Defina OPENAI_API_KEY no backend. RECIPE_AI_MODEL é opcional (padrão gpt-4.1-mini). Crie a chave em https://platform.openai.com/api-keys e configure a cobrança/créditos na plataforma da API. Reinicie o backend após alterar as variáveis. Sem chave o endpoint retorna 503 com uma mensagem amigável. Não inclua a chave no aplicativo.

POST /api/recipes/:id/assistant exige autenticação, propriedade da receita e acesso ativo. Corpo: { "quantity": 100, "discount": 10, "currency": "BRL" }. Retorna simulation e text. Usa os cálculos existentes; profitMargin permanece markup sobre custo. O resultado considera apenas custos cadastrados e não representa lucro líquido. Preço unitário arredondado a centavos antes de calcular a receita da venda.

Usa a Responses API da OpenAI com store: false, sem armazenar a resposta para recuperação posterior pela API. Envia ao provedor apenas nome da receita, cálculos, simulação e nomes/valores dos custos adicionais; não envia cadastro de clientes. Não altera preços nem envia mensagens automaticamente. A interface informa o envio à IA antes do acionamento.

Limite inicial: 20 solicitações por usuário por janela de 24 horas, em memória por instância. Reinicia com o servidor e não é uma cota de assinatura persistente. Antes de escalar para múltiplas instâncias ou vender cotas por plano, usar armazenamento compartilhado/persistente. Timeout do provedor: 30 segundos, sem repetição automática, resposta limitada a 1000 tokens.

## Validação

Compilação do backend e verificação TypeScript do mobile. Testes da simulação e do cálculo de receitas. A chamada real ao provedor e a interação visual ainda precisam ser verificadas em ambiente configurado; os testes locais não consomem créditos de IA.

A integração operacional do Telegram permanece independente, com ANTHROPIC_API_KEY. Não é necessária para a assistente de receitas.
