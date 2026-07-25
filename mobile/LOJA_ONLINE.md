# Loja Online e Marketplace

## O que está disponível

A Loja Online é um recurso de assinatura paga. A confeitaria configura a vitrine no app ou na área web; clientes acessam uma URL pública, montam o pedido e acompanham seu status no navegador. A loja também pode aparecer no marketplace do DocePreço.

O backend é a autoridade para acesso: operações de escrita em `/api/store` exigem um plano pago válido. Lojas inativas ou de assinantes com plano vencido deixam de ser públicas.

## Fluxo do pedido

```text
Confeitaria configura loja e catálogo
        ↓
Cliente acessa /loja/:slug, escolhe produtos e adicionais
        ↓
API recalcula preço, desconto, frete e valida horário/estoque
        ↓
Pedido online é criado e o estoque é baixado numa transação
        ↓
Push avisa a confeitaria; gestão continua em Pedidos
```

O preço recebido do navegador nunca é usado como fonte de verdade. A API obtém produtos e adicionais do banco, aplica descontos e calcula o valor final. Quando um produto possui estoque limitado, a baixa condicional dentro da transação impede venda acima do disponível.

## Recursos

- Nome, slug, descrição, logo, capa, endereço, telefone e Instagram da loja.
- Publicação, aceita pedidos, entrega/retirada, pedido mínimo, taxa de entrega e formas de pagamento.
- Horários comerciais configuráveis; a loja continua visível quando fechada, mas pedidos são bloqueados.
- Produtos com receita opcional, foto por URL, disponibilidade, preço público, desconto percentual ou fixo e estoque limitado ou ilimitado.
- Adicionais por item.
- Pedido público com nome, telefone, endereço, observação, forma de pagamento e troco.
- Histórico de pedidos públicos por telefone e acompanhamento de pedido por URL.
- Marketplace com filtros de texto, cidade, categoria, entrega grátis, taxa, distância, vitrine e busca de produtos.

## Rotas

### Confeitaria autenticada — `/api/store`

| Método | Rota | Plano pago para escrita |
| --- | --- | --- |
| GET | `/my`, `/settings` | Não |
| PATCH | `/my` | Sim |
| PUT | `/settings` | Sim |
| GET/POST | `/products` | POST sim |
| PUT/DELETE | `/products/:id` | Sim |
| GET/POST | `/addons` | POST sim |
| PUT/DELETE | `/addons/:id` | Sim |

### Público — `/api/public`

| Método | Rota | Finalidade |
| --- | --- | --- |
| GET | `/stores` | Lista do marketplace com paginação e filtros |
| GET | `/products/featured`, `/products/search` | Vitrine e busca de produtos |
| GET | `/store/:slug` | Catálogo e configurações públicas da loja |
| POST | `/store/:slug/orders` | Cria pedido público |
| GET | `/store/:slug/orders/:orderId` | Acompanha pedido |
| GET | `/customer/orders?phone=` | Histórico público por telefone |

## Onde fica no código

| Camada | Arquivos principais |
| --- | --- |
| API autenticada | `backend/src/presentation/routes/storeRoutes.ts` e `StoreController.ts` |
| API pública | `backend/src/presentation/routes/publicRoutes.ts` |
| Regras | `backend/src/domain/utils/discount.ts`, `businessHours.ts` e serviço de planos |
| Banco | `store_settings`, `store_products`, `store_addons` e `orders` |
| Mobile | `mobile/src/presentation/screens/Store*.tsx` e `OrdersScreen.tsx` |
| Web | `web/src/pages/LojaPage.tsx`, `LojasPage.tsx`, `ExplorarPage.tsx` e `MeusPedidosPage.tsx` |

## Notificações

Um pedido online aprovado pela API tenta enviar um push ao proprietário com `type: "new_order"` e `orderId`. No Android, o app registra o canal `orders` para que a notificação tenha alta prioridade; ao ser aberta, conduz a pessoa para a gestão de encomendas.
