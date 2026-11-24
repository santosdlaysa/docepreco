# Materiais organizados no admin

Acesse **Materiais do time**. As categorias aparecem como botões com contagem e, na visualização Todas, como seções separadas. Busca e filtro por área continuam disponíveis.

| Categoria | Quantidade |
| --- | ---: |
| Conteúdos para redes sociais | 7 |
| Imagens do aplicativo | 7 |
| Notificações | 19 |
| WhatsApp | 10 |
| Atendimento | 10 |
| Comercial | 10 |
| Suporte | 3 |
| Cobranças | 5 |
| Campanhas | 3 |
| Total | 74 |

## Notificações

O catálogo inclui ativação, boas-vindas, primeira receita, revisão de custos e ingredientes, rotina de vendas, orçamento, loja, retorno de inativos, suporte, assinatura expirada, vencimento próximo, falha de renovação, nova versão, novo pedido, estoque baixo e resumo de vendas. Há variações para os temas de ativação.

Cada modelo mostra título, corpo, grupo candidato, condição de uso e ação. **Preparar notificação** abre o formulário do admin com o texto preenchido. Você pode editar, cancelar ou utilizar o fluxo existente de criação/envio. Preparar e cancelar não criam registros nem enviam mensagens.

O editor oferece grupos por plano e seleção individual de até 100 contas. Os grupos não selecionam automaticamente contas com estoque baixo, falha de renovação, novo pedido ou versão antiga. As condições individuais precisam ser verificadas antes do uso. Não duplicar as notificações transacionais já existentes de pedidos/resumo diário.

Modelos de novo pedido, estoque baixo, resumo de vendas, falha de renovação e vencimento próximo exigem seleção individual. O formulário permite buscar contas, selecionar/remover destinatários e agendar, mas bloqueia troca desses modelos para grupo e não envia com lista vazia. Os IDs escolhidos são persistidos para o agendamento; a condição de negócio de cada conta não é reavaliada automaticamente.

## Imagens

Os conteúdos com artes prontas têm prévia e link de download. Os arquivos de aplicação ficam em `web/public/agent-materials/`, com nomes C1 a C7; o catálogo só vincula imagens registradas em `agentGeneratedImages.json` após salvamento. A categoria Imagens do aplicativo contém sete capturas reais já utilizadas no site, com download individual e em ZIP. Esses recursos pertencem ao catálogo estático e não incluem relatórios financeiros privados.

Concluídas as sete artes C1–C7: arquivos PNG verificados e conteúdo revisado visualmente. Os dois ZIPs são `artes-docepreco.zip` (sete artes) e `imagens-aplicativo.zip` (sete capturas reais). Os posts têm legenda separada com botão Copiar legenda. São 14 arquivos de imagem vinculados aos 74 materiais; imagens não contam como novas notificações.

As artes são verticais, com dimensões 1122×1402 ou 1086×1448 conforme o resultado do gerador. Não são screenshots fictícios. Algumas frases de C3/C4 têm pontuação duplicada, registrada como limitação estética. Os arquivos de marketing do admin não são pré-carregados no cache offline da loja PWA, para evitar baixar as artes e ZIPs no aparelho de todo visitante.

## Testes

`node scripts/test-agent-materials.cjs` verifica catálogo, IDs, nove categorias, títulos, limites das notificações, arquivos PNG/JPEG reais, agrupamento, busca, filtros, clipboard/fallback, foco e callback de preparação.

`node scripts/test-notification-drafts.cjs` verifica preenchimento do formulário e cancelamento, com API simulada, garantindo zero chamadas de criação/envio apenas ao preparar o modelo.

Os testes de interface usam handlers reais em harness de hooks/refs e SSR; não substituem validação visual no navegador nem entrega de push em dispositivo.

Na prévia compilada local, também foram verificados no navegador: categoria Notificações, contagem de 19 modelos, busca com acento por renovação e confirmação de cópia. A prévia isolada não envia notificações.
