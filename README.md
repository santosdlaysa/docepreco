# DocePreco

Aplicativo mobile para precificacao de doces, desenvolvido para confeiteiras iniciantes e profissionais. Calcule custos, defina precos de venda e acompanhe suas vendas de forma simples e eficiente.

## Tecnologias

| Camada | Stack |
|--------|-------|
| **Mobile** | React Native 0.83 + Expo 55 + TypeScript |
| **Backend** | Node.js + Express + TypeScript |
| **Banco de dados** | PostgreSQL (UUID) |
| **Arquitetura** | Clean Architecture (Domain/Application/Infrastructure/Presentation) |
| **Assinaturas** | RevenueCat (react-native-purchases) |
| **Monitoramento** | Sentry (@sentry/react-native) |
| **Notificacoes** | Expo Notifications + Push Tokens |
| **Email** | Resend |
| **Deploy** | Render (backend) + EAS (mobile builds) |

## Funcionalidades

### Gratuitas

- **Ingredientes** - Cadastro com nome, quantidade, preco e unidade (g, kg, ml, l, unidade)
- **Receitas** - Criacao com ingredientes, custos adicionais e margem de lucro configuravel
- **Calculo automatico** - Custo total, custo por unidade, preco sugerido e lucro estimado
- **Vendas** - Registro de vendas com receita, quantidade, preco e data
- **Dashboard** - Estatisticas mensais de vendas, receita total, ultimas vendas
- **PDF de orcamento** - Geracao e compartilhamento de orcamentos em PDF
- **Modo demo** - Teste completo do app sem cadastro (para avaliacao)

### Premium (via RevenueCat)

- Ingredientes e receitas ilimitados (free: 15 ingredientes, 5 receitas)
- PDF com branding personalizado
- Relatorios avancados (graficos, receitas mais vendidas, analise de margem)
- Gestao de clientes (contato, aniversarios, WhatsApp)
- Sistema de pedidos/agendamentos
- Calculo de mao de obra profissional
- Lista de compras inteligente
- Sugestoes de receitas com orientacao de custos
- Precos sazonais (multiplicadores por temporada)
- Historico de precos de ingredientes

**Planos:** Mensal (R$ 14,90) | Anual (R$ 89,90)

## Estrutura do Projeto

```
docepreco/
├── backend/
│   └── src/
│       ├── domain/          # Entidades, repositorios (interfaces), servicos
│       ├── application/     # Casos de uso (CRUD)
│       ├── infrastructure/  # Banco de dados, repositorios (Postgres)
│       └── presentation/    # Controllers, rotas, middleware
├── mobile/
│   └── src/
│       ├── domain/          # Entidades
│       ├── data/            # API client, premium (RevenueCat), demo, storage
│       └── presentation/    # Screens, components, contexts, navigation, theme
```

## Rotas da API

### Autenticacao (`/api/auth`)
| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/register` | Registrar usuario |
| POST | `/login` | Login (retorna JWT 30 dias) |
| GET | `/me` | Dados do usuario autenticado |

### Receitas (`/api/recipes`) - requer auth
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/` | Listar receitas |
| GET | `/:id` | Detalhe da receita |
| POST | `/` | Criar receita (verifica limite) |
| PUT | `/:id` | Atualizar receita |
| DELETE | `/:id` | Excluir receita |
| POST | `/:id/calculate` | Calcular custo/preco |

### Ingredientes (`/api/ingredients`) - requer auth
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/` | Listar ingredientes |
| GET | `/:id` | Detalhe do ingrediente |
| POST | `/` | Criar ingrediente (verifica limite) |
| PUT | `/:id` | Atualizar ingrediente |
| DELETE | `/:id` | Excluir ingrediente |

### Vendas (`/api/sales`) - requer auth
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/` | Listar vendas (`?period=week\|month`) |
| POST | `/` | Registrar venda |
| DELETE | `/:id` | Excluir venda |

### Metas (`/api/goals`) - requer auth
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/?month=X&year=Y` | Obter meta de receita do mes |
| PUT | `/` | Criar/atualizar meta mensal |

### Temporadas (`/api/seasons`) - requer auth
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/` | Listar temporadas |
| GET | `/:id` | Detalhe da temporada |
| POST | `/` | Criar temporada |
| PUT | `/:id` | Atualizar temporada |
| DELETE | `/:id` | Excluir temporada |

### Historico de Precos (`/api/ingredients/:id/price-history`) - requer auth
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/` | Listar historico de precos do ingrediente |

### Push Tokens (`/api/push-tokens`) - requer auth
| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/register` | Registrar token de push |
| POST | `/unregister` | Remover token de push |

### Banners (`/api/banners`)
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/active` | Listar banners ativos (publico) |
| GET | `/` | Listar todos (admin) |
| POST | `/` | Criar banner (admin) |
| PUT | `/:id` | Atualizar banner (admin) |
| DELETE | `/:id` | Excluir banner (admin) |

### Notificacoes (`/api/notifications`) - admin
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/` | Listar notificacoes |
| POST | `/` | Criar notificacao |
| POST | `/send` | Enviar notificacao push |
| DELETE | `/:id` | Excluir notificacao |

### Dicas (`/api/tips`) - admin
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/active` | Listar dicas ativas (publico) |
| GET | `/` | Listar todas (admin) |
| POST | `/` | Criar dica (admin) |
| PUT | `/:id` | Atualizar dica (admin) |
| DELETE | `/:id` | Excluir dica (admin) |

### Outros
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/stats` | Dashboard de estatisticas |
| POST | `/api/premium/webhooks/revenuecat` | Webhook do RevenueCat |
| POST | `/api/premium/admin/users/:id/premium` | Admin: toggle premium |
| GET | `/health` | Health check |

## Telas do App

| Tela | Descricao |
|------|-----------|
| Onboarding | Introducao para novos usuarios |
| Login / Registro | Autenticacao com email e senha |
| Esqueci a Senha | Recuperacao de senha por email |
| Home | Dashboard com stats, acoes rapidas e banners |
| Receitas | Listagem, criacao e edicao de receitas (com sugestoes) |
| Detalhe da Receita | Calculo completo, compartilhar PDF |
| Ingredientes | Listagem, criacao e edicao de ingredientes |
| Historico de Precos | Evolucao de preco de um ingrediente ao longo do tempo |
| Vendas | Registro e historico de vendas por periodo |
| Clientes | Gestao de clientes (contato, aniversario, WhatsApp) |
| Pedidos | Gestao de pedidos/agendamentos |
| Relatorios | Graficos e analise de desempenho |
| Temporadas | Multiplicadores de preco sazonais |
| Config. PDF | Personalizacao do PDF de orcamento |
| Perfil | Info do usuario, status premium, suporte WhatsApp |
| Paywall | Tela de assinatura premium |
| Premium Ad | Promocao do plano premium (pos-login) |
| Politica de Privacidade | Texto da politica |

## Como Rodar

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edite .env com suas credenciais
npm run migrate
npm run dev
```

### Mobile

```bash
cd mobile
npm install
npm start
```

### Build (EAS)

```bash
npx expo prebuild --clean
eas build --profile development --platform android
eas build --profile development --platform ios
```

## Variaveis de Ambiente

### Backend (`.env`)

```
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/docepreco
JWT_SECRET=your-secret-key
REVENUECAT_WEBHOOK_SECRET=<token>
ADMIN_SECRET=<token>
TELEGRAM_BOT_TOKEN=<token do bot>
TELEGRAM_CHAT_ID=<id do chat/grupo>
RESEND_API_KEY=<chave da API Resend>
ASC_ISSUER_ID=<Apple App Store Connect issuer ID>
ASC_KEY_ID=<App Store Connect key ID>
ASC_PRIVATE_KEY=<App Store Connect private key>
ASC_VENDOR_NUMBER=<App Store Connect vendor number>
```

### Mobile (`.env` / EAS Secrets)

```
EXPO_PUBLIC_API_URL=https://docepreco.onrender.com/api
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_XXXX
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_XXXX
EXPO_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

## Banco de Dados

| Tabela | Descricao |
|--------|-----------|
| `users` | Usuarios (email, senha, empresa, status premium, last_seen_at) |
| `ingredients` | Ingredientes (nome, qtd compra, preco, unidade) |
| `ingredient_price_history` | Historico de precos de ingredientes |
| `recipes` | Receitas (nome, rendimento, margem de lucro) |
| `recipe_ingredients` | Ingredientes da receita (quantidade usada) |
| `recipe_additional_costs` | Custos adicionais da receita |
| `sales` | Vendas (receita, quantidade, preco, data) |
| `revenue_goals` | Metas de receita mensal (por usuario/mes/ano) |
| `seasons` | Temporadas com multiplicadores de preco |
| `password_reset_codes` | Codigos de recuperacao de senha |
| `push_tokens` | Tokens de push notification por dispositivo |
| `notifications` | Fila de notificacoes push |
| `notification_templates` | Templates reutilizaveis de notificacao |
| `banners` | Banners gerenciados pelo admin |
| `motivational_tips` | Dicas motivacionais para usuarios |
| `request_logs` | Log de requisicoes da API (monitoramento) |
| `app_settings` | Configuracoes globais do app (key-value) |

## Integracao Premium (RevenueCat)

**Fluxo:** App (SDK) -> RevenueCat -> Webhook -> Backend (atualiza DB) -> App (refresh)

- **Limites free:** 15 ingredientes, 5 receitas
- **Entitlement:** `premium`
- **Webhook events:** INITIAL_PURCHASE, RENEWAL, EXPIRATION, CANCELLATION, etc.
- **Admin override:** `POST /api/admin/users/:id/premium` com header `X-Admin-Secret`

## Notificacoes Telegram

Bot de monitoramento que envia alertas em tempo real e relatorios periodicos para um chat/grupo do Telegram.

### Configuracao

Adicione ao `.env` do backend:

```
TELEGRAM_BOT_TOKEN=<token do bot>
TELEGRAM_CHAT_ID=<id do chat/grupo>
```

### Alertas em tempo real

| Evento | Gatilho | Exemplo de mensagem |
|--------|---------|---------------------|
| **Novo cadastro** | Usuario se registra | `🆕 Novo cadastro! 🏪 Doces da Maria 📧 maria@email.com` |
| **Evento premium** | Webhook RevenueCat (assinatura, renovacao, cancelamento, etc.) | `💎 Nova assinatura (ios) 🏪 Doces da Maria` |
| **Venda registrada** | Usuario cria uma venda | `🧁 Nova venda! 🏪 Doces da Maria 🍰 Bolo de chocolate × 2 💰 R$ 120,00` |
| **Marco de usuarios** | Total de usuarios atinge 50, 100, 200, 500, 1000, 2000, 5000 ou 10000 | `🎉 Marco atingido! 👥 500 usuarios cadastrados!` |
| **Erro no servidor** | Rota retorna status >= 500 | `🚨 Erro no servidor POST /api/sales Status: 500` |
| **Rota lenta** | Rota demora > 2000ms | `🐢 Rota lenta GET /api/recipes Duracao: 3200ms` |

### Comandos do Bot

| Comando | Descricao |
|---------|-----------|
| `/ajuda` | Lista todos os comandos disponiveis |
| `/downloads` | Stats de registros por periodo + split iOS/Android + dados App Store Connect |
| `/premium` | Lista todos os usuarios premium com datas de expiracao |
| `/vendashoje` | Resumo de vendas do dia |
| `/top` | Top 10 usuarios por receita (ultimos 30 dias) |
| `/erros` | Ultimos 10 erros do servidor (status 5xx) |
| `/lentas` | Ultimas 10 rotas lentas (>2s) |
| `/logs` | Ultimas 20 requisicoes da API |
| `/atualizar` | Envio de email em massa para todos os usuarios |
| `/relatorio` | Relatorio diario sob demanda |
| `/semanal` | Relatorio semanal sob demanda |
| `/meta` | Status da meta diaria de registros |

### Relatorios periodicos

| Relatorio | Horario | Conteudo |
|-----------|---------|----------|
| **Diario** | Todo dia as 8h (Sao Paulo) | Total de usuarios, premium, novos do dia |
| **Semanal** | Segunda-feira as 9h (Sao Paulo) | Novos usuarios, receitas criadas, vendas, receita total, top 5 usuarios ativos |

### Arquitetura

Servico principal: `backend/src/infrastructure/services/telegramService.ts`
Rotas de comandos: `backend/src/presentation/routes/telegramRoutes.ts`

| Funcao | Onde e chamada |
|--------|---------------|
| `notifyNewUser` | `AuthController.register` |
| `notifyUserMilestone` | `AuthController.register` (apos criar usuario) |
| `notifyPremiumEvent` | `PremiumController.revenueCatWebhook` |
| `notifySale` | `SaleController.create` |
| `sendErrorAlert` | Middleware de request logs (`server.ts`) |
| `sendSlowApiAlert` | Middleware de request logs (`server.ts`) |
| `sendDailyUserReport` | Cron `0 8 * * *` (`server.ts`) |
| `sendWeeklyReport` | Cron `0 9 * * 1` (`server.ts`) |

Todas as notificacoes sao **fire-and-forget** — nao bloqueiam a resposta da API nem causam erro se o Telegram estiver indisponivel.

## Integracoes Externas

### App Store Connect

Integrado via JWT para consultar dados reais de downloads da App Store (usado pelo comando `/downloads` do Telegram).

Variaveis necessarias: `ASC_ISSUER_ID`, `ASC_KEY_ID`, `ASC_PRIVATE_KEY`, `ASC_VENDOR_NUMBER`.

### Resend (Email)

Usado para envio de emails transacionais (recuperacao de senha) e campanhas em massa (comando `/atualizar`).

Variavel necessaria: `RESEND_API_KEY`.

## Suporte

- WhatsApp integrado na tela de perfil
- Sentry para monitoramento de erros em producao
- Modo demo para testes e avaliacao na loja
