# Produção inteligente — primeira versão

No celular: início → Produção inteligente. Na área web: Produção.

Selecione um período de entrega para reunir os produtos de encomendas pendentes e em produção, calcular receitas proporcionais ao rendimento cadastrado e comparar os ingredientes com o estoque atual. A lista de compras pode ser compartilhada; na web também pode ser baixada em texto.

## Regras

- Datas inicial e final inclusivas. Pedidos sem data, rascunhos, prontos, entregues e cancelados não entram no cálculo.
- Pedidos com vários itens usam a lista de itens; o resumo legado só é usado quando a lista está vazia.
- Vínculo pelo ID da receita, nunca por semelhança de nome. Produtos sem vínculo aparecem com aviso.
- Quantidades fracionárias de receita são permitidas. A versão inicial não arredonda lotes inteiros nem embalagens de compra.
- Ingredientes comuns são somados antes de descontar o saldo. Converte g/kg, ml/l e unidades de embalagem com peso cadastrado.
- Sub-receitas por unidade usam seu rendimento. Por peso, exigem peso final explícito na receita; não se presume que a soma dos ingredientes seja o peso após cozinhar. Vínculos circulares são sinalizados.
- Estoque desconhecido não é considerado disponível: a lista mostra a necessidade integral e pede conferência. Ingredientes sem conversão ou receitas incompletas geram aviso de lista parcial. Adicionais de pedidos são sinalizados para conferência separada.
- Somente consulta: não reserva estoque, não registra compras, não dá baixa e não altera pedidos. Para encomendas já em produção, conferir o que já foi separado.
- Não altera preços ou assinaturas. O acesso inicial acompanha a página de produção web existente, sem nova cobrança. O modo de demonstração mobile solicita entrada na conta para calcular dados reais.

## API e publicação

`GET /api/orders/production-plan?start=YYYY-MM-DD&end=YYYY-MM-DD`, autenticado com o JWT da conta. Todas as consultas usam o usuário autenticado. Não há migration nova.

Publicar o backend antes de disponibilizar os novos clientes web/mobile. A implementação local não publica nem ativa cobrança automaticamente.

## Validação

Testes em `productionPlanner.test.ts` cobrem cálculo, rendimento, conversões, sub-receitas, períodos, vários itens, estoque desconhecido e ausência de mutações. `ProductionController.test.ts` cobre validação de entrada, escopo da conta e erro de leitura.
