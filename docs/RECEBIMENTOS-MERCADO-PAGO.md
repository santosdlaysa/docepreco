# Recebimentos online da loja (Mercado Pago · Checkout Pro com split)

Checkout integrado para lojas do plano **Master**: o cliente final paga online, os produtos e a
entrega caem na conta Mercado Pago da própria loja e a taxa de serviço do DocePreço é separada
automaticamente via `marketplace_fee` (modelo marketplace do Mercado Pago).

## Como funciona

1. **Plataforma (admin)** define a taxa de serviço fixa por pedido e libera o recurso em
   *Configuração de Planos → Taxa de serviço dos pedidos Master*.
2. **Loja (Master)** conecta a própria conta Mercado Pago por OAuth em *Minha Loja → Recebimentos
   da loja*, aceita as condições (onde recebe, tarifas do MP, taxa DocePreço, estornos) e ativa o
   checkout. O consentimento fica registrado (`consent_at` + `terms_version`).
3. **Cliente final** escolhe "Pagar online" na loja pública; a taxa de serviço aparece no resumo
   antes da confirmação e é somada ao total. O PIX é transparente: o QR + copia-e-cola do MP
   aparecem na própria página do pedido (`/v1/payments` com `application_fee`, criado com o token
   da loja). Cartão fica no botão "Pagar com cartão", que abre o Checkout Pro (`marketplace_fee`).
   Ambos valem pela janela de 30 min do pedido.
4. **Confirmação** chega pelo webhook (`POST /api/store-payments/webhook`, assinatura HMAC
   validada); há reconciliação manual e busca por `external_reference` para notificações perdidas.
5. **Estorno/cancelamento** é feito pela loja na tela de Recebimentos (nunca editando o pedido —
   pedidos com pagamento online ficam travados contra edição de valores e exclusão).

> A tarifa de processamento do Mercado Pago sai da parte do vendedor (a loja). Não prometer
> recebimento integral. Pix direto na chave da loja e pagamento na entrega seguem sem split.

## Variáveis de ambiente (Render)

Sem todas elas o recurso fica indisponível e o admin não consegue liberar (`ready=false`).

| Variável | Valor |
| --- | --- |
| `MP_MARKETPLACE_CLIENT_ID` | Client ID da aplicação marketplace no painel de desenvolvedor do MP |
| `MP_MARKETPLACE_CLIENT_SECRET` | Client secret da mesma aplicação |
| `MP_MARKETPLACE_REDIRECT_URI` | `https://<backend>/api/store-payments/oauth/callback` (igual ao cadastrado no MP) |
| `MP_MARKETPLACE_WEBHOOK_URL` | `https://<backend>/api/store-payments/webhook` |
| `MP_MARKETPLACE_WEBHOOK_SECRET` | Assinatura secreta do webhook (painel do MP → Webhooks) |
| `MP_MARKETPLACE_ENCRYPTION_KEY` | 64 hex chars (`openssl rand -hex 32`) — criptografa os tokens OAuth das lojas |
| `STORE_CHECKOUT_BASE_URL` | Base pública da loja, ex.: `https://docepreco.com.br/loja` (o retorno vira `<base>/<slug>?paymentOrder=<id>`) |

Configuração no painel do Mercado Pago:

- Criar a aplicação como **marketplace** (Checkout Pro), com a redirect URI acima.
- Habilitar notificações de **pagamentos** apontando para a `MP_MARKETPLACE_WEBHOOK_URL` e copiar
  a assinatura secreta.

## Validação antes de liberar (etapa 1 do plano)

Com credenciais de teste, conectar uma conta de vendedor de teste e conferir:

1. Pedido online cria preferência com `marketplace_fee` e abre o Checkout Pro.
2. Pagamento aprovado divide: taxa na conta da plataforma, restante (menos tarifa MP) na conta da loja.
3. Webhook marca o pedido como pago; estorno devolve as duas partes e cancela o pedido.
4. Checkout expirado (30 min) pode ser cancelado pela loja com devolução de estoque.

## Pontos de código

- Regras puras + assinatura do webhook: `backend/src/domain/services/storePaymentRules.ts` (testes em `storePaymentRules.test.ts`)
- OAuth, tokens criptografados, preferência, sync/estorno: `backend/src/infrastructure/services/storePaymentService.ts`
- Rotas (loja, admin, webhook, callback): `backend/src/presentation/routes/storePaymentRoutes.ts`
- Checkout público e idempotência por `checkoutRequestId`: `backend/src/presentation/routes/publicRoutes.ts`
- Tabelas: `backend/src/infrastructure/database/storePaymentsMigration.ts`
- Telas: web `web/src/user/pages/StoreReceiving.tsx` + `web/src/pages/StorePaymentAdmin.tsx`; mobile `mobile/src/presentation/components/StoreReceiving.tsx`; loja pública `web/src/pages/LojaPage.tsx`

## Financeiro

`orders.service_fee_cents` e `orders.delivery_fee_cents` separam a comissão da entrega: a
automação de vendas (`OrderSaleAutomation`) lança como receita da loja apenas produtos + entrega,
nunca a taxa do DocePreço. A receita da plataforma aparece no painel admin; pedidos estornados ou
contestados não contam como receita líquida.
