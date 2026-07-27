# DocePreço

Plataforma para confeiteiras precificarem produtos, organizarem a operação, venderem pela loja online e acompanharem o negócio. O repositório reúne a API, o aplicativo Expo/React Native e duas experiências web: painel administrativo e PWA público/para a confeitaria.

## Visão geral

| Componente | Diretório | Responsabilidade |
| --- | --- | --- |
| API | `backend/` | Regras de negócio, PostgreSQL, integrações e API REST |
| App mobile | `mobile/` | Aplicativo da confeitaria para iOS, Android e web Expo |
| Web | `web/` | Landing, marketplace/lojas públicas, área da confeitaria e painel admin |
| Evolution API | `docker-compose.yml` | Integração opcional para WhatsApp |

### Stack

- **Mobile:** React Native 0.83, Expo 55, TypeScript e React Navigation.
- **Web:** React 18, Vite, Tailwind, React Router, Recharts e PWA.
- **Backend:** Node.js, Express, TypeScript, PostgreSQL e Clean Architecture.
- **Assinaturas e pagamentos:** RevenueCat, Stripe e PIX via Mercado Pago.
- **Comunicação/observabilidade:** Expo Push, Resend, Telegram, Sentry, UXCAM e Evolution API.
- **IA operacional:** Anthropic Claude, acionado pelo bot do Telegram.

## Capacidades do produto

### Gestão da confeitaria

- Ingredientes, custo de compra, unidades e histórico de preços.
- Receitas com ingredientes, sub-receitas, custos adicionais, rendimento, margem e cálculo automático de custo, preço sugerido e lucro.
- Vendas, metas mensais, relatórios, sazonalidade e exportação de orçamento em PDF.
- Clientes, encomendas manuais e online, status, pagamentos e agendamento de entrega/retirada.
- Caixa: abertura/fechamento, sessões e movimentações.
- Financeiro: despesas, resumo e visão de fluxo do negócio.
- Estoque de produtos do catálogo, com baixa atômica para pedidos online.

### Vendas digitais

- **Loja Online:** catálogo público por URL, fotos, preços, descontos, adicionais, estoque, pedido mínimo, entrega/retirada, formas de pagamento e horário de funcionamento.
- **Marketplace:** busca de lojas por cidade, categoria, texto, entrega grátis, taxa ou distância; vitrine e busca de produtos.
- Pedido público sem conta, acompanhamento por link e histórico por telefone; o dono recebe push de novo pedido.
- Banners e planos de anúncio para confeitaria divulgar a loja.

### Experiência, retenção e suporte

- Onboarding e conteúdo remoto: banners, dicas, FAQ, categorias, receitas sugeridas, ingredientes globais e changelog.
- Push imediato ou agendado, templates de notificação e resumo diário de vendas.
- Cupons, teste grátis, indicações e campanhas de winback.
- Feedbacks, sugestões e chat de suporte in-app com indicador de digitação.
- Modo demonstração, tutoriais de precificação/vendas e políticas de privacidade.

### Planos

O sistema trabalha com os tiers `free`, `premium` e `master`; o estado da assinatura tem prazo de validade e é validado também no backend. Os limites e a lista de benefícios são configuráveis pelo painel.

- **Free:** limites configuráveis de ingredientes e receitas.
- **Premium:** recursos avançados de gestão, relatórios e vendas.
- **Master:** recursos pagos mais completos, incluindo a operação da Loja Online conforme a configuração vigente.

> Não use valores de preço ou limites deste arquivo como fonte de verdade. Eles podem ser alterados no painel em **Configurações de planos**; o app lê `GET /api/admin/settings/plans`.

## Arquitetura

```
mobile (Expo) ─┐
web (React/PWA)├──> API Express ───> PostgreSQL
               │        │
               │        ├── RevenueCat / Stripe / Mercado Pago
               │        ├── Expo Push / Resend / Telegram / Claude
               │        └── Evolution API (WhatsApp, opcional)
clientes web ──┘
```

O backend está separado em `domain`, `application`, `infrastructure` e `presentation`. As migrations são idempotentes e são executadas no boot; `npm run migrate` permite executá-las manualmente.

## Executar localmente

Pré-requisitos: Node.js compatível com Expo 55, npm, PostgreSQL e, opcionalmente, Docker Desktop para WhatsApp.

### 1. API

```bash
cd backend
npm install
Copy-Item .env.example .env # PowerShell
npm run migrate
npm run dev
```

A API inicia em `http://localhost:3000`; saúde em `GET /health` e documentação interativa em `http://localhost:3000/api/docs`.

### 2. Web

```bash
cd web
npm install
Copy-Item .env.example .env # PowerShell
npm run dev
```

Defina `VITE_API_URL=http://localhost:3000/api` no `.env` para desenvolvimento local.

### 3. Mobile

```bash
cd mobile
npm install
Copy-Item .env.example .env # PowerShell
npm start
```

Para builds: `eas build --profile development --platform android` ou `ios`. Os perfis estão em [`eas.json`](eas.json).

### 4. WhatsApp (opcional)

```bash
docker compose up -d
```

Configure `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` e `EVOLUTION_INSTANCE` no backend. A conexão e o QR code são controlados pelo painel, em **WhatsApp**. Sem essa integração, o sistema pode usar o WhatsApp Web como alternativa.

## Variáveis de ambiente

Copie os arquivos `.env.example`; nunca versione `.env` ou segredos reais.

### Backend

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `DATABASE_URL` | Sim | Conexão PostgreSQL |
| `JWT_SECRET` | Sim | Assinatura dos tokens de usuário |
| `PORT` | Não | Porta da API (padrão `3000`) |
| `DOCEPRECO_ADMIN_SECRET` | Produção | Protege as rotas administrativas |
| `CORS_ORIGINS` | Recomendado | Origens web permitidas, separadas por vírgula |
| `APP_BASE_URL` | Para PIX/Stripe | URL pública da API para callbacks |
| `REVENUECAT_WEBHOOK_SECRET` | RevenueCat | Validação do webhook |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe | Checkout e webhook de cartão |
| `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET` | PIX | Criação e confirmação de PIX |
| `RESEND_API_KEY` | E-mail | Recuperação de senha e campanhas |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Telegram | Alertas, relatórios e comandos |
| `ANTHROPIC_API_KEY` | Claude | Conversa `/claude` no Telegram |
| `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE` | WhatsApp | Evolution API |
| `ASC_ISSUER_ID`, `ASC_KEY_ID`, `ASC_PRIVATE_KEY`, `ASC_VENDOR_NUMBER` | Opcional | Dados da App Store no Telegram |

### Clientes

| Projeto | Variáveis |
| --- | --- |
| `web/` | `VITE_API_URL` |
| `mobile/` | `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`, `EXPO_PUBLIC_SENTRY_DSN` |

## API e autenticação

- Rotas de usuário usam `Authorization: Bearer <JWT>`.
- Rotas admin usam `x-admin-secret: <DOCEPRECO_ADMIN_SECRET>`.
- Endpoints públicos não exigem credencial; alguns têm rate limit.
- A especificação navegável disponível em `/api/docs` é a referência de payloads e schemas. A tabela abaixo é o índice funcional das rotas implementadas.

| Área | Base | Operações principais |
| --- | --- | --- |
| Autenticação | `/api/auth` | registro, login, perfil, alteração/recuperação de senha, sugestão e exclusão de conta |
| Produção | `/api/ingredients`, `/api/recipes`, `/api/ingredients/:ingredientId/price-history` | CRUD, cálculo de receita e histórico de preços |
| Vendas | `/api/sales`, `/api/stats`, `/api/goals`, `/api/seasons`, `/api/orders` | vendas, indicadores, metas, temporadas e encomendas |
| Financeiro | `/api/cash`, `/api/expenses` | caixa/sessões/movimentos e despesas/resumo |
| Assinatura | `/api/premium/*`, `/api/webhooks/revenuecat`, `/api/stripe/*`, `/api/pix/*` | sincronização, teste, RevenueCat, checkout Stripe e PIX/Mercado Pago |
| Loja autenticada | `/api/store` | configurações, catálogo e adicionais; escrita exige plano pago |
| Loja pública | `/api/public` | estatísticas, marketplace, vitrine/busca, loja por slug e pedidos públicos |
| Indicações | `/api/referrals/*` | dados/progresso do usuário e gestão admin |
| Engajamento | `/api/banners`, `/api/notifications`, `/api/tips`, `/api/notification-templates`, `/api/push-tokens` | conteúdo, campanhas, templates e dispositivos push |
| Conteúdo admin | `/api/admin/global-ingredients`, `featured-recipes`, `feature-flags`, `faq`, `coupons`, `categories`, `changelog`, `onboarding` | leitura pública de itens ativos e CRUD administrativo |
| Relacionamento | `/api/admin/feedbacks`, `/api/admin/suggestions`, `/api/support` | feedback, sugestões e conversas de suporte |
| Administração | `/api/admin` | dashboard, usuários, assinaturas, lojas, logs, dados, testes, e-mail e configurações |
| Operação | `/api/admin/whatsapp`, `/api/admin/winback`, `/api/admin/telegram-alerts`, `/api/telegram/webhook` | WhatsApp, recuperação, agendamentos e bot Telegram |

## Banco de dados

As migrations criam e evoluem o esquema. As entidades principais são:

| Domínio | Tabelas |
| --- | --- |
| Conta e assinatura | `users`, `password_reset_codes`, `premium_events`, `revenuecat_aliases`, `pix_requests`, `referrals`, `renewal_notifications_sent` |
| Precificação | `ingredients`, `ingredient_price_history`, `recipes`, `recipe_ingredients`, `recipe_additional_costs`, `recipe_sub_recipes`, `sales`, `revenue_goals`, `seasons` |
| Operação | `orders`, `expenses`, `cash_sessions`, `cash_movements` |
| Loja e marketplace | `store_settings`, `store_products`, `store_addons` |
| Conteúdo/engajamento | `banners`, `push_tokens`, `notifications`, `motivational_tips`, `notification_templates`, `app_settings`, `telegram_alerts`, `global_ingredients`, `featured_recipes`, `featured_recipe_ingredients`, `recipe_categories`, `feature_flags`, `faq_items`, `coupons`, `feedbacks`, `suggestions`, `changelog_entries`, `onboarding_steps`, `support_messages`, `winback_offers` |
| Auditoria | `request_logs` |

## Painéis e interfaces

- **App mobile:** operação diária da confeitaria, incluindo receitas, vendas, caixa, finanças, pedidos, loja, suporte e assinatura.
- **Área web da confeitaria:** receitas, ingredientes, vendas, relatórios, pedidos, caixa, loja e perfil.
- **Web público:** landing, download, explorador/marketplace, vitrines de lojas, checkout de pedido e área de pedidos do cliente.
- **Admin:** usuários e assinaturas, lojas, conteúdo, anúncios, PIX, notificações, suporte, WhatsApp, Telegram, referências, logs, banco e campanhas.

## Processos automáticos e integrações

- Push pendente e resumos de vendas são verificados a cada minuto.
- Renovação manual é avaliada diariamente; assinaturas expiradas são rebaixadas por cron horário.
- Relatórios e metas do Telegram têm agendamento configurável no banco, com fuso `America/Sao_Paulo`.
- O bot Telegram aceita comandos operacionais e `/claude <pergunta>` para uma conversa contextual; `/fim` a encerra.
- A API registra requisições em `request_logs`, com campos sensíveis redigidos. Em produção, defina `CORS_ORIGINS` e todos os segredos.

## Qualidade

```bash
cd backend
npm test
npm run test:e2e
npm run test:coverage
npm run build

cd ../web
npm run build
```

## Documentos relacionados

- [Documentação da Loja Online](mobile/LOJA_ONLINE.md)
- [Configuração do Premium](PREMIUM_SETUP.md)
- [Changelog histórico](CHANGELOG.md)
- [Planejamento de funcionalidades](PLANEJAMENTO_NOVAS_FEATURES.md)
