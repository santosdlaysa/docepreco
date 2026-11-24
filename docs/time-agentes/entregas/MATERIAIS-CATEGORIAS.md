# Materiais organizados no admin

Acesse **Materiais do time**. As categorias aparecem como botões com contagem e, na visualização Todas, como seções separadas. Busca e filtro por área continuam disponíveis.

| Categoria | Quantidade |
| --- | ---: |
| Conteúdos para redes sociais | 7 |
| Notificações | 19 |
| WhatsApp | 10 |
| Atendimento | 10 |
| Comercial | 10 |
| Suporte | 3 |
| Cobranças | 5 |
| Campanhas | 3 |
| Total | 67 |

## Notificações

O catálogo inclui ativação, boas-vindas, primeira receita, revisão de custos e ingredientes, rotina de vendas, orçamento, loja, retorno de inativos, suporte, assinatura expirada, vencimento próximo, falha de renovação, nova versão, novo pedido, estoque baixo e resumo de vendas. Há variações para os temas de ativação.

Cada modelo mostra título, corpo, grupo candidato, condição de uso e ação. **Preparar notificação** abre o formulário do admin com o texto preenchido. Você pode editar, cancelar ou utilizar o fluxo existente de criação/envio. Preparar e cancelar não criam registros nem enviam mensagens.

Os alvos existentes são grupos de plano. Eles não selecionam automaticamente contas com estoque baixo, falha de renovação, novo pedido ou versão antiga. As condições individuais precisam ser verificadas antes do uso. Não duplicar as notificações transacionais já existentes de pedidos/resumo diário.

## Imagens

Os sete conteúdos têm prévia e link de download da arte correspondente. Os arquivos de aplicação ficam em `web/public/agent-materials/`, com nomes C1 a C7. Esses recursos pertencem ao catálogo estático e não incluem dados de clientes ou relatórios financeiros.

## Testes

`node scripts/test-agent-materials.cjs` verifica catálogo, IDs, oito categorias, títulos, limites das notificações, imagens PNG reais e dimensões mínimas, agrupamento, busca, filtros, clipboard/fallback, foco e callback de preparação.

`node scripts/test-notification-drafts.cjs` verifica preenchimento do formulário e cancelamento, com API simulada, garantindo zero chamadas de criação/envio apenas ao preparar o modelo.

Os testes de interface usam handlers reais em harness de hooks/refs e SSR; não substituem validação visual no navegador nem entrega de push em dispositivo.
