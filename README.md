# DocePreco

Aplicativo mobile para precificacao de doces, desenvolvido para confeiteiras iniciantes e profissionais. Calcule custos, defina precos de venda e acompanhe suas vendas de forma simples e eficiente.

## Tecnologias

| Camada | Stack |
|--------|-------|
| **Mobile** | React Native 0.83 + Expo 55 + TypeScript |
| **Backend** | Node.js + Express + TypeScript |
| **Banco de dados** | PostgreSQL (UUID) |
| **Painel Admin** | React + Vite + Tailwind CSS + TypeScript |
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

## Painel Admin (Web)

Painel de administracao em React para gerenciar o app remotamente. Acessivel em `/admin` com autenticacao via header `X-Admin-Secret`.

### Dashboard e Usuarios

- **Dashboard** - Estatisticas em tempo real (usuarios, receitas, vendas, receita) + envio de email em massa
- **Usuarios** - Listar, filtrar, ativar/desativar premium, ver dados do usuario (receitas, ingredientes, vendas)

### Conteudo

- **Ingredientes Globais** - Precos de referencia sugeridos aos usuarios ao cadastrar ingredientes
- **Receitas Sugeridas** - Receitas prontas com ingredientes que usuarios premium usam como base (substitui hardcoded)
- **Categorias** - Categorias de receitas com emoji, seletor visual com 32 opcoes
- **FAQ / Ajuda** - Perguntas frequentes exibidas no app, organizadas por categoria
- **Changelog** - Tela "O que ha de novo" com novidades por versao
- **Onboarding** - Telas de boas-vindas configuráveis com preview de celular interativo

### Comunicacao

- **Banners** - Banners no app com agendamento, tipos (info, aviso, promocao, update)
- **Notificacoes Push** - Criar e enviar push segmentado (todos, premium, free) com agendamento
- **Dicas Motivacionais** - Dicas diarias + templates de notificacoes locais com agendamento editavel
- **Feedbacks** - Avaliacoes dos usuarios (1-5 estrelas) com resposta individual
- **Suporte Chat** - Chat em tempo real com usuarios do app (indicador de digitando, badge de nao lidas)

### Configuracao

- **Planos** - Limite de receitas free, preco premium, lista de features de cada plano
- **Cupons** - Codigos de desconto com %, limite de usos, validade e validacao via API
- **Feature Flags** - Liga/desliga funcionalidades do app remotamente (9 flags pre-populadas)
- **Configuracoes** - Meta diaria de cadastros integrada com bot Telegram

### Sistema

- **Logs** - Feed de atividades em tempo real (cadastros, vendas, premium)
- **Rotas HTTP** - Monitoramento de requisicoes da API com metricas

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
├── web/
│   └── src/
│       ├── admin/           # Shell do painel admin (sidebar, navegacao)
│       ├── pages/           # Paginas do painel (29 paginas)
│       ├── lib/             # API client + tipos TypeScript
│       └── components.tsx   # Componentes compartilhados (toast, modal, skeleton)
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

### Templates de Notificacao (`/api/notification-templates`)
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/active` | Listar templates ativos com agendamento (publico) |
| GET | `/` | Listar todos (admin) |
| PUT | `/:id` | Atualizar template + agendamento (admin) |
| POST | `/:id/send` | Enviar push do template (admin) |

### Dicas (`/api/tips`)
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/active` | Listar dicas ativas (publico) |
| GET | `/` | Listar todas (admin) |
| POST | `/` | Criar dica (admin) |
| PUT | `/:id` | Atualizar dica (admin) |
| DELETE | `/:id` | Excluir dica (admin) |

### Ingredientes Globais (`/api/admin/global-ingredients`)
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/active` | Listar ingredientes com precos de referencia (publico) |
| GET | `/` | Listar todos (admin) |
| POST | `/` | Criar ingrediente (admin) |
| PUT | `/:id` | Atualizar ingrediente (admin) |
| DELETE | `/:id` | Excluir ingrediente (admin) |

### Receitas Sugeridas (`/api/admin/featured-recipes`)
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/active` | Listar receitas ativas com ingredientes (publico) |
| GET | `/` | Listar todas (admin) |
| POST | `/` | Criar receita com ingredientes (admin) |
| PUT | `/:id` | Atualizar receita com ingredientes (admin) |
| DELETE | `/:id` | Excluir receita em cascata (admin) |

### Configuracao de Planos (`/api/admin/settings/plans`)
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/` | Ler configuracao de planos (publico) |
| PUT | `/` | Atualizar limites, preco e features (admin) |

### Feature Flags (`/api/admin/feature-flags`)
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/active` | Listar flags ativas (publico) |
| GET | `/` | Listar todas (admin) |
| POST | `/` | Criar flag (admin) |
| PUT | `/:id` | Atualizar flag (admin) |
| DELETE | `/:id` | Excluir flag (admin) |

### FAQ (`/api/admin/faq`)
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/active` | Listar FAQs ativas (publico) |
| GET | `/` | Listar todas (admin) |
| POST | `/` | Criar FAQ (admin) |
| PUT | `/:id` | Atualizar FAQ (admin) |
| DELETE | `/:id` | Excluir FAQ (admin) |

### Cupons (`/api/admin/coupons`)
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/validate/:code` | Validar cupom e retornar desconto (publico) |
| GET | `/` | Listar todos (admin) |
| POST | `/` | Criar cupom (admin) |
| PUT | `/:id` | Atualizar cupom (admin) |
| DELETE | `/:id` | Excluir cupom (admin) |

### Categorias (`/api/admin/categories`)
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/active` | Listar categorias ativas (publico) |
| GET | `/` | Listar todas (admin) |
| POST | `/` | Criar categoria (admin) |
| PUT | `/:id` | Atualizar categoria (admin) |
| DELETE | `/:id` | Excluir categoria (admin) |

### Feedbacks (`/api/admin/feedbacks`)
| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/` | Enviar feedback (requer auth do usuario) |
| GET | `/` | Listar todos (admin) |
| PUT | `/:id` | Atualizar status (admin) |
| POST | `/:id/reply` | Responder feedback (admin) |

### Changelog (`/api/admin/changelog`)
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/active` | Listar changelog ativo (publico) |
| GET | `/` | Listar todos (admin) |
| POST | `/` | Criar entrada (admin) |
| PUT | `/:id` | Atualizar entrada (admin) |
| DELETE | `/:id` | Excluir entrada (admin) |

### Onboarding (`/api/admin/onboarding`)
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/active` | Listar etapas ativas (publico) |
| GET | `/` | Listar todas (admin) |
| POST | `/` | Criar etapa (admin) |
| PUT | `/:id` | Atualizar etapa (admin) |
| DELETE | `/:id` | Excluir etapa (admin) |

### WhatsApp (`/api/admin/whatsapp`) - admin
| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/instance` | Criar instancia na Evolution API (so 1 vez) |
| GET | `/qrcode` | Obter QR code para conectar o WhatsApp |
| GET | `/status` | Status da conexao (open, close, connecting) |
| POST | `/send` | Enviar mensagem (body: `{ phone, message }`) |

### Suporte Chat (`/api/support`)
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/messages` | Listar mensagens do usuario (requer auth) |
| POST | `/messages` | Enviar mensagem como usuario (requer auth) |
| GET | `/unread` | Contagem de nao lidas do usuario (requer auth) |
| GET | `/typing` | Verificar se admin esta digitando (requer auth) |
| GET | `/admin/conversations` | Listar todas as conversas (admin) |
| GET | `/admin/conversations/:userId` | Mensagens de um usuario (admin) |
| POST | `/admin/conversations/:userId` | Responder usuario (admin) |
| POST | `/admin/conversations/:userId/typing` | Sinalizar que admin esta digitando (admin) |
| GET | `/admin/unread` | Total de mensagens nao lidas (admin) |

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
| Onboarding | Introducao para novos usuarios (configuravel pelo admin) |
| Login / Registro | Autenticacao com email e senha |
| Esqueci a Senha | Recuperacao de senha por email |
| Home | Dashboard com stats, acoes rapidas e banners |
| Receitas | Listagem, criacao e edicao de receitas (com sugestoes premium) |
| Detalhe da Receita | Calculo completo, compartilhar PDF |
| Ingredientes | Listagem, criacao e edicao de ingredientes |
| Historico de Precos | Evolucao de preco de um ingrediente ao longo do tempo |
| Vendas | Registro e historico de vendas por periodo |
| Clientes | Gestao de clientes (contato, aniversario, WhatsApp) |
| Pedidos | Gestao de pedidos/agendamentos |
| Relatorios | Graficos e analise de desempenho |
| Temporadas | Multiplicadores de preco sazonais |
| Config. PDF | Personalizacao do PDF de orcamento |
| Suporte Chat | Chat em tempo real com o suporte (bolhas, indicador de digitando) |
| Perfil | Info do usuario, status premium, suporte WhatsApp e chat |
| Paywall | Tela de assinatura premium |
| Premium Ad | Promocao do plano premium (pos-login) |
| Politica de Privacidade | Texto da politica |

## Como Rodar

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edite .env com suas credenciais
npm run migrate
npm run dev
```

### 2. Mobile

```bash
cd mobile
npm install
npm start
```

### 3. Painel Admin (Web)

```bash
cd web
npm install
npm run dev
```

### 4. WhatsApp (Evolution API) - Opcional

Necessario para enviar mensagens pelo WhatsApp direto do painel admin. Requer Docker.

```bash
# 1. Abrir Docker Desktop (precisa estar rodando)

# 2. Subir a Evolution API (na raiz do projeto)
docker compose up -d

# 3. Criar instancia (so precisa rodar 1 vez)
curl -X POST http://localhost:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: docepreco-evo-secret-key" \
  -d "{\"instanceName\":\"docepreco\",\"integration\":\"WHATSAPP-BAILEYS\",\"qrcode\":true}"

# 4. Conectar seu WhatsApp - abra no navegador para ver o QR code:
#    http://localhost:8080/manager (painel da Evolution API)
#    Ou via API:
curl -s http://localhost:8080/instance/connect/docepreco \
  -H "apikey: docepreco-evo-secret-key" | jq .

# 5. Escaneie o QR code com o WhatsApp Business
#    (WhatsApp > Aparelhos conectados > Conectar aparelho)
```

**Importante:**
- O Docker Desktop precisa estar aberto para a Evolution API funcionar
- Configure o Docker para iniciar com o Windows: Docker Desktop > Settings > Start Docker Desktop when you sign in
- O container reinicia automaticamente com o Docker (`restart: unless-stopped`)
- Sem a Evolution API, o botao de WhatsApp no admin abre o WhatsApp Web como fallback

### 5. Build (EAS)

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
DOCEPRECO_ADMIN_SECRET=<token para acesso ao painel admin>
REVENUECAT_WEBHOOK_SECRET=<token>
TELEGRAM_BOT_TOKEN=<token do bot>
TELEGRAM_CHAT_ID=<id do chat/grupo>
RESEND_API_KEY=<chave da API Resend>
ASC_ISSUER_ID=<Apple App Store Connect issuer ID>
ASC_KEY_ID=<App Store Connect key ID>
ASC_PRIVATE_KEY=<App Store Connect private key>
ASC_VENDOR_NUMBER=<App Store Connect vendor number>
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=docepreco-evo-secret-key
EVOLUTION_INSTANCE=docepreco
```

### Mobile (`.env` / EAS Secrets)

```
EXPO_PUBLIC_API_URL=https://docepreco.onrender.com/api
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_XXXX
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_XXXX
EXPO_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

### Painel Admin Web

```
VITE_API_URL=https://docepreco.onrender.com/api
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
| `notification_templates` | Templates de notificacao com agendamento configuravel |
| `banners` | Banners gerenciados pelo admin |
| `motivational_tips` | Dicas motivacionais para usuarios |
| `request_logs` | Log de requisicoes da API (monitoramento) |
| `app_settings` | Configuracoes globais do app (key-value) |
| `global_ingredients` | Ingredientes com precos de referencia (sugestao) |
| `featured_recipes` | Receitas sugeridas para usuarios premium |
| `featured_recipe_ingredients` | Ingredientes das receitas sugeridas |
| `recipe_categories` | Categorias de receitas com emoji |
| `feature_flags` | Feature flags para controle remoto de funcionalidades |
| `faq_items` | Perguntas frequentes (FAQ) |
| `coupons` | Cupons de desconto para o plano premium |
| `feedbacks` | Feedbacks dos usuarios com nota e resposta |
| `changelog_entries` | Changelog com novidades por versao |
| `onboarding_steps` | Telas de onboarding configuráveis |
| `support_messages` | Mensagens de suporte (chat usuario-admin) |

## Integracao Premium (RevenueCat)

**Fluxo:** App (SDK) -> RevenueCat -> Webhook -> Backend (atualiza DB) -> App (refresh)

- **Limites free:** 15 ingredientes, 5 receitas (configuravel pelo painel admin)
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
| **Meta diaria** | 12h, 15h, 18h e 21h (Sao Paulo) | Progresso da meta de cadastros (configuravel pelo painel) |

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
| `sendDailyUserReport` | Cron `0 8 * * *` (`server.ts`) |
| `sendWeeklyReport` | Cron `0 9 * * 1` (`server.ts`) |
| `sendDailyGoalProgress` | Cron `0 12,15,18,21 * * *` (`server.ts`) |

Todas as notificacoes sao **fire-and-forget** — nao bloqueiam a resposta da API nem causam erro se o Telegram estiver indisponivel.

## Integracoes Externas

### App Store Connect

Integrado via JWT para consultar dados reais de downloads da App Store (usado pelo comando `/downloads` do Telegram).

Variaveis necessarias: `ASC_ISSUER_ID`, `ASC_KEY_ID`, `ASC_PRIVATE_KEY`, `ASC_VENDOR_NUMBER`.

### Resend (Email)

Usado para envio de emails transacionais (recuperacao de senha) e campanhas em massa (comando `/atualizar`).

Variavel necessaria: `RESEND_API_KEY`.

## Seeds Automaticos

Na primeira execucao da migration, os seguintes dados sao criados automaticamente:

| Dados | Quantidade | Origem |
|-------|-----------|--------|
| Dicas motivacionais | 8 | Textos padrao |
| Templates de notificacao | 4 | inactivity_2d, inactivity_5d, daily_sales, weekly_reminder |
| Feature flags | 9 | Funcionalidades premium do app (todas ativas) |
| Receitas sugeridas | 12 | SUGGESTED_RECIPES do mobile (com ingredientes) |
| Telas de onboarding | 4 | SLIDES do OnboardingScreen (com icones e cores) |
| Agendamento de notificacoes | 4 | Horarios originais hardcoded no mobile |

### Evolution API (WhatsApp)

Permite enviar mensagens pelo WhatsApp direto do painel admin, sem precisar abrir o WhatsApp Web.

- **Container Docker:** `evolution-api` na porta 8080
- **Arquivo:** `docker-compose.yml` (raiz do projeto)
- **Service:** `backend/src/infrastructure/services/whatsappService.ts`
- **Rotas:** `backend/src/presentation/routes/whatsappRoutes.ts`
- **Variaveis:** `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`

## Suporte

- **Chat in-app** - Chat de suporte integrado ao app com indicador de digitando em tempo real
  - Botao flutuante na Home com badge de nao lidas e animacao de pulso
  - Botao na tela de Perfil (secao Ajuda)
  - Painel admin com layout 2 paineis (conversas + chat) e botao flutuante com badge
  - Typing indicator: admin digita no web -> usuario ve "Suporte digitando..." no mobile
  - Polling: 3s (typing), 10s (mensagens), 30s (lista de conversas e badges)
- **WhatsApp** integrado na tela de perfil como canal alternativo
- Sentry para monitoramento de erros em producao
- Modo demo para testes e avaliacao na loja
- Painel admin para gerenciamento remoto do app
