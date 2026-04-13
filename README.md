# DocePreco

Aplicativo mobile para precificacao de doces, desenvolvido para confeiteiras iniciantes e profissionais. Calcule custos, defina precos de venda e acompanhe suas vendas de forma simples e eficiente.

## Tecnologias

| Camada | Stack |
|--------|-------|
| **Mobile** | React Native + Expo 53 + TypeScript |
| **Backend** | Node.js + Express + TypeScript |
| **Banco de dados** | PostgreSQL (UUID) |
| **Arquitetura** | Clean Architecture (Domain/Application/Infrastructure/Presentation) |
| **Assinaturas** | RevenueCat (react-native-purchases) |
| **Monitoramento** | Sentry (@sentry/react-native) |
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

### Outros
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/stats` | Dashboard de estatisticas |
| POST | `/api/webhooks/revenuecat` | Webhook do RevenueCat |
| POST | `/api/admin/users/:id/premium` | Admin: toggle premium |
| GET | `/health` | Health check |

## Telas do App

| Tela | Descricao |
|------|-----------|
| Onboarding | Introducao para novos usuarios |
| Login / Registro | Autenticacao com email e senha |
| Home | Dashboard com stats, acoes rapidas e banners |
| Receitas | Listagem, criacao e edicao de receitas |
| Detalhe da Receita | Calculo completo, compartilhar PDF |
| Ingredientes | Listagem, criacao e edicao de ingredientes |
| Vendas | Registro e historico de vendas por periodo |
| Perfil | Info do usuario, status premium, suporte WhatsApp |
| Paywall | Tela de assinatura premium |
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
| `users` | Usuarios (email, senha, empresa, status premium) |
| `ingredients` | Ingredientes (nome, qtd compra, preco, unidade) |
| `recipes` | Receitas (nome, rendimento, margem de lucro) |
| `recipe_ingredients` | Ingredientes da receita (quantidade usada) |
| `recipe_additional_costs` | Custos adicionais da receita |
| `sales` | Vendas (receita, quantidade, preco, data) |

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

### Relatorios periodicos

| Relatorio | Horario | Conteudo |
|-----------|---------|----------|
| **Diario** | Todo dia as 8h (Sao Paulo) | Total de usuarios, premium, novos do dia |
| **Semanal** | Segunda-feira as 9h (Sao Paulo) | Novos usuarios, receitas criadas, vendas, receita total, top 5 usuarios ativos |

### Arquitetura

Todas as funcoes ficam em `backend/src/infrastructure/services/telegramService.ts` e sao chamadas nos controllers/middleware:

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

## Suporte

- WhatsApp integrado na tela de perfil
- Sentry para monitoramento de erros em producao
- Modo demo para testes e avaliacao na loja
