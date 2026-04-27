# DocePreco - Novas Funcionalidades do Painel Admin

Data: 27/04/2026

---

## Resumo

Foram implementadas **10 novas funcionalidades** e **1 melhoria** no painel admin web que controlam o app mobile DocePreco remotamente. Cada funcionalidade possui:

- Tabela no banco de dados PostgreSQL (migration automatica)
- Repository com queries SQL
- Controller com validacao e tratamento de erros
- Rotas Express (admin + publicas para o app)
- Pagina no painel admin com CRUD completo

A sidebar do painel foi reorganizada em **4 secoes**: Conteudo, Comunicacao, Configuracao e Sistema.

---

## 1. Ingredientes Globais

**O que e:** Base de ingredientes com precos de referencia que o app sugere aos usuarios quando eles vao cadastrar um ingrediente novo.

**Por que:** O usuario nao precisa pesquisar quanto custa cada ingrediente. O app ja sugere precos medios como ponto de partida.

**Funcionalidades do painel:**
- Criar, editar e excluir ingredientes
- Busca por nome ou categoria
- Calculo automatico de preco por unidade (preco / embalagem)
- Categorias reutilizaveis com autocomplete (Laticinios, Farinhas, etc.)
- Campos: nome, preco, unidade (g/kg/ml/L/un), quantidade da embalagem, categoria

**Endpoints:**
- `GET /api/admin/global-ingredients` - listar todos (admin)
- `GET /api/admin/global-ingredients/active` - listar todos (app)
- `POST /api/admin/global-ingredients` - criar (admin)
- `PUT /api/admin/global-ingredients/:id` - atualizar (admin)
- `DELETE /api/admin/global-ingredients/:id` - excluir (admin)

**Tabela:** `global_ingredients`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | Chave primaria |
| name | VARCHAR(255) | Nome do ingrediente |
| price | DECIMAL(10,2) | Preco da embalagem |
| unit | VARCHAR(10) | Unidade (g, kg, ml, L, un) |
| package_amount | DECIMAL(10,3) | Quantidade na embalagem |
| category | VARCHAR(100) | Categoria (ex: Laticinios) |
| created_at | TIMESTAMP | Data de criacao |
| updated_at | TIMESTAMP | Ultima atualizacao |

**Arquivos criados:**
- `backend/src/infrastructure/repositories/PostgresGlobalIngredientRepository.ts`
- `backend/src/presentation/controllers/GlobalIngredientController.ts`
- `backend/src/presentation/routes/globalIngredientRoutes.ts`
- `web/src/pages/GlobalIngredientsPage.tsx`

---

## 2. Receitas Sugeridas (Premium)

**O que e:** Receitas prontas com ingredientes, quantidades e precos que usuarios premium podem usar como base na tela de criar receita. Substitui o array `SUGGESTED_RECIPES` que estava hardcoded no arquivo `mobile/src/data/recipes/suggestedRecipes.ts`.

**Por que:** Antes as 12 receitas sugeridas (Brigadeiro Gourmet, Bolo de Cenoura, Brownie, Palha Italiana, etc.) estavam fixas no codigo do app. Agora podem ser adicionadas, editadas e removidas pelo painel sem precisar de update na App Store.

**Como funciona no app:** Na tela de criar receita, usuarios premium clicam em "Sugestoes de receitas" e escolhem uma receita. O app preenche automaticamente nome, rendimento, margem de lucro e todos os ingredientes com precos.

**Funcionalidades do painel:**
- Criar, editar e excluir receitas com ingredientes completos
- Cada receita tem: nome, rendimento (unidades), margem de lucro (%), ordem de exibicao
- Cada ingrediente tem: nome, quantidade usada, unidade, quantidade da embalagem, preco de compra
- Expandir receita na lista para ver tabela detalhada de ingredientes
- Ativar/desativar receitas individualmente
- Adicionar/remover ingredientes dinamicamente no modal

**Endpoints:**
- `GET /api/admin/featured-recipes` - listar todas (admin)
- `GET /api/admin/featured-recipes/active` - listar ativas (app)
- `POST /api/admin/featured-recipes` - criar com ingredientes (admin)
- `PUT /api/admin/featured-recipes/:id` - atualizar com ingredientes (admin)
- `DELETE /api/admin/featured-recipes/:id` - excluir em cascata (admin)

**Tabelas:**

`featured_recipes`:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | Chave primaria |
| name | VARCHAR(255) | Nome da receita |
| yield | INTEGER | Rendimento em unidades |
| profit_margin | DECIMAL(5,2) | Margem de lucro (%) |
| is_active | BOOLEAN | Se aparece no app |
| sort_order | INTEGER | Ordem de exibicao |
| created_at | TIMESTAMP | Data de criacao |

`featured_recipe_ingredients`:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | Chave primaria |
| recipe_id | UUID | FK para featured_recipes |
| name | VARCHAR(255) | Nome do ingrediente |
| quantity_used | DECIMAL(10,3) | Quantidade usada na receita |
| unit | VARCHAR(10) | Unidade (g, kg, ml, l, unit) |
| purchase_quantity | DECIMAL(10,3) | Quantidade da embalagem |
| purchase_price | DECIMAL(10,2) | Preco da embalagem |

**Arquivos criados:**
- `backend/src/infrastructure/repositories/PostgresFeaturedRecipeRepository.ts`
- `backend/src/presentation/controllers/FeaturedRecipeController.ts`
- `backend/src/presentation/routes/featuredRecipeRoutes.ts`
- `web/src/pages/FeaturedRecipesPage.tsx`

---

## 3. Configuracao de Planos

**O que e:** Controle centralizado dos limites e precos dos planos Free e Premium.

**Por que:** Antes o limite de receitas gratuitas (5 em `mobile/src/presentation/premium/limits.ts`) e o preco do premium (R$ 14,90) estavam hardcoded no app. Agora podem ser alterados pelo painel e o app consulta os valores atualizados.

**Funcionalidades do painel:**
- Alterar limite de receitas do plano Free
- Alterar preco mensal do plano Premium
- Gerenciar lista de funcionalidades do plano Free (adicionar/remover itens com Enter)
- Gerenciar lista de funcionalidades do plano Premium (adicionar/remover itens)
- Valores padrao caso nao tenha sido configurado:
  - Free: 5 receitas
  - Premium: R$ 14,90/mes
  - Features Free: "Ate 5 receitas", "Calculo de custos", "Registro de vendas"
  - Features Premium: "Receitas ilimitadas", "Ficha tecnica em PDF", "Relatorios avancados"

**Endpoints:**
- `GET /api/admin/settings/plans` - ler configuracao (app + admin)
- `PUT /api/admin/settings/plans` - atualizar configuracao (admin)

**Armazenamento:** Tabela `app_settings` (key-value existente), chaves:
- `plan_free_recipe_limit` - limite de receitas free
- `plan_premium_price` - preco mensal premium
- `plan_free_features` - JSON array de features free
- `plan_premium_features` - JSON array de features premium

**Arquivos criados:**
- `backend/src/presentation/controllers/PlanConfigController.ts`
- `backend/src/presentation/routes/planConfigRoutes.ts`
- `web/src/pages/PlanConfigPage.tsx`

---

## 4. Feature Flags

**O que e:** Sistema de liga/desliga de funcionalidades do app remotamente, sem precisar de update na App Store.

**Por que:** Permite lancar funcionalidades gradualmente, desativar features com bug em producao, ou fazer A/B testing. As funcionalidades premium que estao em `mobile/src/presentation/premium/limits.ts` (PREMIUM_FEATURES) agora podem ser controladas remotamente.

**Funcionalidades do painel:**
- Toggle visual ON/OFF para cada flag com icone grande
- Criar novas flags com chave unica e descricao
- Editar descricao e estado
- Excluir flags
- Chave formatada automaticamente (lowercase, underscores, sem espacos)
- Badge ON/OFF com cor verde/cinza
- Exibicao da chave em fonte monospacada

**Flags pre-populadas no primeiro boot (todas ativas):**

| Chave | O que controla no app |
|-------|----------------------|
| `pdfCustomBranding` | PDF personalizado - logo, cores e sem marca DocePreco nos orcamentos |
| `advancedReports` | Relatorios completos - graficos de faturamento, receitas mais vendidas e margem real |
| `clientsManagement` | Gestao de clientes - cadastro, historico e aniversarios |
| `ordersManagement` | Agenda de encomendas - pedidos, status de producao e lembretes de entrega |
| `laborCostCalc` | Calculo profissional - mao de obra e custos fixos no preco real da receita |
| `smartShoppingList` | Lista de compras inteligente - calcula o que precisa comprar pras encomendas |
| `ingredientPriceHistory` | Historico de precos - evolucao do custo dos ingredientes ao longo do tempo |
| `seasonalPricing` | Precificacao por temporada - ajuste automatico no Natal, Pascoa e datas especiais |
| `suggestedRecipes` | Receitas sugeridas - receitas prontas como base para usuarios premium |

**Endpoints:**
- `GET /api/admin/feature-flags` - listar todas (admin)
- `GET /api/admin/feature-flags/active` - listar ativas (app)
- `POST /api/admin/feature-flags` - criar (admin)
- `PUT /api/admin/feature-flags/:id` - atualizar (admin)
- `DELETE /api/admin/feature-flags/:id` - excluir (admin)

**Tabela:** `feature_flags`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | Chave primaria |
| key | VARCHAR(100) | Chave unica da flag |
| description | TEXT | Descricao do que controla |
| is_enabled | BOOLEAN | Se a feature esta ativa |
| created_at | TIMESTAMP | Data de criacao |

**Arquivos criados:**
- `backend/src/infrastructure/repositories/PostgresFeatureFlagRepository.ts`
- `backend/src/presentation/controllers/FeatureFlagController.ts`
- `backend/src/presentation/routes/featureFlagRoutes.ts`
- `web/src/pages/FeatureFlagsPage.tsx`

---

## 5. FAQ / Central de Ajuda

**O que e:** Perguntas frequentes exibidas dentro do app em uma tela de ajuda.

**Por que:** Reduz o volume de duvidas por suporte direto. O usuario encontra respostas sem precisar sair do app.

**Funcionalidades do painel:**
- Criar, editar e excluir perguntas e respostas
- Organizar por categorias (Geral, Premium, Receitas, etc.)
- Definir ordem de exibicao
- Ativar/desativar perguntas individuais
- Visualizacao tipo accordion (clica na pergunta, expande a resposta)
- Autocomplete de categorias existentes

**Endpoints:**
- `GET /api/admin/faq` - listar todas (admin)
- `GET /api/admin/faq/active` - listar ativas (app)
- `POST /api/admin/faq` - criar (admin)
- `PUT /api/admin/faq/:id` - atualizar (admin)
- `DELETE /api/admin/faq/:id` - excluir (admin)

**Tabela:** `faq_items`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | Chave primaria |
| question | TEXT | Pergunta |
| answer | TEXT | Resposta |
| category | VARCHAR(100) | Categoria |
| sort_order | INTEGER | Ordem de exibicao |
| is_active | BOOLEAN | Se aparece no app |
| created_at | TIMESTAMP | Data de criacao |

**Arquivos criados:**
- `backend/src/infrastructure/repositories/PostgresFaqRepository.ts`
- `backend/src/presentation/controllers/FaqController.ts`
- `backend/src/presentation/routes/faqRoutes.ts`
- `web/src/pages/FaqPage.tsx`

---

## 6. Cupons de Desconto

**O que e:** Codigos promocionais que dao desconto no plano Premium.

**Por que:** Permite criar campanhas de marketing, parcerias com influencers, ou promocoes sazonais sem alterar codigo.

**Funcionalidades do painel:**
- Criar cupons com codigo, percentual de desconto, limite de usos e validade
- Copiar codigo para clipboard com um clique
- Status automatico calculado: Ativo, Inativo, Expirado, Esgotado
- Ativar/desativar cupons
- Contador de usos em tempo real
- Usos ilimitados (maxUses = 0) ou limitados
- Codigo formatado automaticamente em maiusculas sem espacos

**Endpoints:**
- `GET /api/admin/coupons` - listar todos (admin)
- `GET /api/admin/coupons/validate/:code` - validar cupom (app, publico)
- `POST /api/admin/coupons` - criar (admin)
- `PUT /api/admin/coupons/:id` - atualizar (admin)
- `DELETE /api/admin/coupons/:id` - excluir (admin)

**Validacao do cupom pelo app:** O endpoint `/validate/:code` verifica automaticamente se o cupom existe, esta ativo, nao expirou e nao atingiu o limite de usos. Retorna o percentual de desconto se valido, ou erro com motivo se invalido.

**Tabela:** `coupons`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | Chave primaria |
| code | VARCHAR(50) | Codigo unico (ex: PROMO50) |
| discount_percent | INTEGER | Percentual de desconto |
| max_uses | INTEGER | Limite de usos (0 = ilimitado) |
| used_count | INTEGER | Quantidade de vezes usado |
| expires_at | TIMESTAMP | Data de expiracao (opcional) |
| is_active | BOOLEAN | Se o cupom esta ativo |
| created_at | TIMESTAMP | Data de criacao |

**Arquivos criados:**
- `backend/src/infrastructure/repositories/PostgresCouponRepository.ts`
- `backend/src/presentation/controllers/CouponController.ts`
- `backend/src/presentation/routes/couponRoutes.ts`
- `web/src/pages/CouponsPage.tsx`

---

## 7. Categorias de Receitas

**O que e:** Categorias para organizar receitas no app (Bolos, Doces Finos, Salgados, etc.).

**Por que:** Ajuda o usuario a organizar e encontrar suas receitas. Tambem pode ser usado para filtros e busca.

**Funcionalidades do painel:**
- Criar, editar e excluir categorias
- Seletor visual com 32 emojis sugeridos organizados por tema:
  - Confeitaria: bolo, cupcake, chocolate, biscoito, torta, donut, pudim, waffle
  - Bebidas: cafe, suco, drinks
  - Salgados: pao, fritura, salgadinhos, pizza, mexicano, marmita, salada
  - Sazonais: Natal, Pascoa, Namorados, festas, Halloween
  - Especiais: infantil, premium, destaque, populares
- Clique no emoji ja seleciona e preenche o nome sugerido se estiver vazio
- Campo manual para digitar qualquer emoji
- Preview do emoji selecionado em tamanho grande com ring de selecao
- Ordenacao e ativar/desativar

**Endpoints:**
- `GET /api/admin/categories` - listar todas (admin)
- `GET /api/admin/categories/active` - listar ativas (app)
- `POST /api/admin/categories` - criar (admin)
- `PUT /api/admin/categories/:id` - atualizar (admin)
- `DELETE /api/admin/categories/:id` - excluir (admin)

**Tabela:** `recipe_categories`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | Chave primaria |
| name | VARCHAR(255) | Nome da categoria |
| icon | VARCHAR(10) | Emoji da categoria |
| sort_order | INTEGER | Ordem de exibicao |
| is_active | BOOLEAN | Se aparece no app |
| created_at | TIMESTAMP | Data de criacao |

**Arquivos criados:**
- `backend/src/infrastructure/repositories/PostgresCategoryRepository.ts`
- `backend/src/presentation/controllers/CategoryController.ts`
- `backend/src/presentation/routes/categoryRoutes.ts`
- `web/src/pages/CategoriesPage.tsx`

---

## 8. Feedbacks dos Usuarios

**O que e:** Canal de comunicacao onde usuarios enviam avaliacoes (1-5 estrelas) e mensagens pelo app, e o admin visualiza e responde pelo painel.

**Por que:** Feedback direto dos usuarios sem depender de reviews da App Store. Permite responder individualmente e acompanhar a satisfacao.

**Funcionalidades do painel:**
- Lista de feedbacks com nota em estrelas, mensagem e dados do usuario (nome, email)
- Filtros por status: Todos, Pendente, Lido, Respondido
- Cards de metricas: total de feedbacks, pendentes, nota media, respondidos
- Marcar como lido (remove destaque visual)
- Responder feedback em modal dedicado (resposta aparece inline com borda lateral)
- Destaque visual amarelo para feedbacks pendentes
- Editar resposta ja enviada

**Endpoints:**
- `GET /api/admin/feedbacks` - listar todos (admin)
- `POST /api/admin/feedbacks` - enviar feedback (app, requer autenticacao JWT)
- `PUT /api/admin/feedbacks/:id` - atualizar status (admin)
- `POST /api/admin/feedbacks/:id/reply` - responder (admin)

**Tabela:** `feedbacks`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | Chave primaria |
| user_id | UUID | FK para users |
| user_name | VARCHAR(255) | Nome do usuario |
| user_email | VARCHAR(255) | Email do usuario |
| message | TEXT | Mensagem do feedback |
| rating | INTEGER | Nota de 1 a 5 |
| status | VARCHAR(20) | pending, read ou replied |
| reply | TEXT | Resposta do admin |
| created_at | TIMESTAMP | Data de criacao |

**Arquivos criados:**
- `backend/src/infrastructure/repositories/PostgresFeedbackRepository.ts`
- `backend/src/presentation/controllers/FeedbackController.ts`
- `backend/src/presentation/routes/feedbackRoutes.ts`
- `web/src/pages/FeedbacksPage.tsx`

---

## 9. Changelog / Novidades

**O que e:** Tela "O que ha de novo" que aparece no app apos atualizacoes, mostrando as novidades de cada versao.

**Por que:** Comunica ao usuario o que mudou sem depender da descricao da App Store. Pode ser mostrado como modal no primeiro acesso apos update.

**Funcionalidades do painel:**
- Criar entradas por versao (ex: v1.3.0)
- Titulo e descricao geral da versao
- Lista de funcionalidades/mudancas (adicionar/remover dinamicamente com Enter ou botao +)
- Ativar/desativar visibilidade (ocultar versoes antigas)
- Exibicao cronologica com badge de versao colorido
- Icone de foguete para cada entrada

**Endpoints:**
- `GET /api/admin/changelog` - listar todos (admin)
- `GET /api/admin/changelog/active` - listar ativos (app)
- `POST /api/admin/changelog` - criar (admin)
- `PUT /api/admin/changelog/:id` - atualizar (admin)
- `DELETE /api/admin/changelog/:id` - excluir (admin)

**Tabela:** `changelog_entries`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | Chave primaria |
| version | VARCHAR(20) | Numero da versao (ex: 1.3.0) |
| title | VARCHAR(255) | Titulo da versao |
| description | TEXT | Descricao geral |
| features | TEXT[] | Array PostgreSQL com lista de novidades |
| is_active | BOOLEAN | Se aparece no app |
| created_at | TIMESTAMP | Data de criacao |

**Arquivos criados:**
- `backend/src/infrastructure/repositories/PostgresChangelogRepository.ts`
- `backend/src/presentation/controllers/ChangelogController.ts`
- `backend/src/presentation/routes/changelogRoutes.ts`
- `web/src/pages/ChangelogPage.tsx`

---

## 10. Onboarding

**O que e:** Telas de boas-vindas que aparecem no primeiro acesso do usuario ao app. Sao as telas de "deslizar" que explicam o app, definidas originalmente em `mobile/src/presentation/screens/OnboardingScreen.tsx` no array `SLIDES`.

**Por que:** Antes as 4 telas estavam hardcoded no app. Agora podem ser editadas, reordenadas, ativadas/desativadas e novas telas podem ser adicionadas sem update na App Store.

**Funcionalidades do painel:**
- Criar, editar e excluir etapas de onboarding
- Seletor visual com 16 icones pre-configurados (nomes do Ionicons usado no app)
- Color picker nativo para cor do icone e cor de fundo
- Campo manual para digitar qualquer nome de icone Ionicons
- Preview de celular interativo com navegacao entre telas (setas)
- Indicador de pagina (dots) no preview
- Botao "Comecar agora" na ultima tela do preview
- Ordenacao e ativar/desativar

**Telas pre-populadas no primeiro boot:**

| # | Titulo | Icone Ionicons | Cor icone | Cor fundo |
|---|--------|---------------|-----------|-----------|
| 1 | Voce sabe se esta lucrando? | sad-outline | #E91E8C | #F8BBD9 |
| 2 | Calcule o custo real de cada receita | calculator-outline | #8B4513 | #F5E6D0 |
| 3 | Defina sua margem de lucro | trending-up-outline | #4CAF50 | #E8F5E9 |
| 4 | Acompanhe suas vendas | cash-outline | #FF9800 | #FFF3E0 |

**Endpoints:**
- `GET /api/admin/onboarding` - listar todas (admin)
- `GET /api/admin/onboarding/active` - listar ativas (app)
- `POST /api/admin/onboarding` - criar (admin)
- `PUT /api/admin/onboarding/:id` - atualizar (admin)
- `DELETE /api/admin/onboarding/:id` - excluir (admin)

**Tabela:** `onboarding_steps`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | Chave primaria |
| title | VARCHAR(255) | Titulo da tela |
| description | TEXT | Texto explicativo |
| image_url | TEXT | URL de imagem (opcional) |
| icon | VARCHAR(50) | Nome do icone Ionicons |
| icon_color | VARCHAR(20) | Cor hex do icone (ex: #E91E8C) |
| icon_bg | VARCHAR(20) | Cor hex do fundo (ex: #F8BBD9) |
| sort_order | INTEGER | Ordem de exibicao |
| is_active | BOOLEAN | Se aparece no app |
| created_at | TIMESTAMP | Data de criacao |

**Arquivos criados:**
- `backend/src/infrastructure/repositories/PostgresOnboardingRepository.ts`
- `backend/src/presentation/controllers/OnboardingController.ts`
- `backend/src/presentation/routes/onboardingRoutes.ts`
- `web/src/pages/OnboardingPage.tsx`

---

## 11. Agendamento de Notificacoes Locais (melhoria)

**O que e:** Controle dos horarios e frequencias de disparo das notificacoes locais (agendadas no celular do usuario) pelo painel admin. Antes os horarios estavam hardcoded em `mobile/src/presentation/utils/notifications.ts`.

**Por que:** Permite alterar quando cada notificacao e disparada sem precisar de update no app. Por exemplo, mudar o lembrete de vendas das 19h para as 20h, ou mudar o lembrete semanal de segunda para quarta.

**O que mudou:**

5 colunas novas na tabela `notification_templates`:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| schedule_type | VARCHAR(20) | Tipo: daily, weekly ou interval |
| schedule_hour | INTEGER | Hora do disparo (0-23) |
| schedule_minute | INTEGER | Minuto do disparo (0-59) |
| schedule_weekday | INTEGER | Dia da semana (1=Dom, 2=Seg... 7=Sab) |
| schedule_interval_hours | INTEGER | Horas de inatividade antes de disparar |

**Valores seedados automaticamente:**

| Template | Tipo | Configuracao |
|----------|------|-------------|
| inactivity_2d | interval | Apos 48h sem abrir o app |
| inactivity_5d | interval | Apos 120h sem abrir o app |
| daily_sales | daily | Todo dia as 19:00 |
| weekly_reminder | weekly | Segunda-feira as 09:00 |

**Funcionalidades do painel (no modal de edicao do template):**
- Seletor de tipo: Diariamente / Semanalmente / Por inatividade
- Campos de hora e minuto (para diario e semanal)
- Seletor de dia da semana com nomes (para semanal)
- Campo de horas de inatividade (para intervalo)
- Preview descritivo em tempo real: "Todo dia as 19:00" ou "Toda Segunda as 09:00"
- Coluna "Agendamento" na tabela com descricao legivel

**Arquivos modificados:**
- `backend/src/infrastructure/database/migrate.ts` - colunas novas + seed dos valores
- `backend/src/infrastructure/repositories/PostgresNotificationTemplateRepository.ts` - campos de agendamento
- `backend/src/presentation/controllers/NotificationTemplateController.ts` - aceita campos de agendamento
- `web/src/lib/api.ts` - tipo NotificationTemplate atualizado
- `web/src/pages/TipsPage.tsx` - UI de agendamento no modal

---

## Organizacao da Sidebar

A sidebar do painel admin foi reorganizada em secoes para facilitar a navegacao com 18 itens:

**Dashboard e Usuarios** (sem secao)
- Dashboard
- Usuarios

**Conteudo**
- Ingredientes (globais)
- Receitas destaque (sugeridas premium)
- Categorias (de receitas)
- FAQ / Ajuda
- Novidades (changelog)
- Onboarding

**Comunicacao**
- Banners
- Notificacoes (push)
- Dicas (motivacionais + templates de notificacao local)
- Feedbacks

**Configuracao**
- Planos (free/premium)
- Cupons (de desconto)
- Feature flags
- Configuracoes (meta diaria)

**Sistema**
- Logs do sistema
- Rotas HTTP

---

## Contagem de Arquivos

### Backend (32 arquivos novos/modificados)
- 1 migration atualizada (`migrate.ts`) com 10 tabelas novas + 5 colunas novas em tabela existente
- 9 repositories novos + 1 modificado
- 10 controllers novos + 1 modificado
- 10 route files novos
- 1 server.ts atualizado (registro das rotas)

### Frontend Web (12 arquivos novos/modificados)
- 10 paginas novas
- 1 api.ts atualizado (tipos + endpoints)
- 1 AdminApp.tsx atualizado (navegacao + imports)
- 1 TipsPage.tsx atualizado (agendamento)

### Tabelas PostgreSQL criadas
1. `global_ingredients` - ingredientes com precos de referencia
2. `featured_recipes` - receitas sugeridas premium
3. `featured_recipe_ingredients` - ingredientes das receitas sugeridas
4. `recipe_categories` - categorias de receitas
5. `feature_flags` - feature flags do app
6. `faq_items` - perguntas frequentes
7. `coupons` - cupons de desconto
8. `feedbacks` - feedbacks dos usuarios
9. `changelog_entries` - novidades por versao
10. `onboarding_steps` - telas de boas-vindas

### Colunas adicionadas em tabelas existentes
- `notification_templates`: schedule_type, schedule_hour, schedule_minute, schedule_weekday, schedule_interval_hours
- `onboarding_steps`: icon, icon_color, icon_bg

### Seeds automaticos (primeiro boot)
- 9 feature flags (funcionalidades premium existentes do app)
- 4 etapas de onboarding (telas atuais do app)
- Configuracao de agendamento dos 4 templates de notificacao existentes

---

## Como usar

1. **Reiniciar o backend** - as migrations criam as tabelas, colunas e seeds automaticamente
2. **Acessar o painel admin** - as novas paginas ja aparecem na sidebar organizada por secoes
3. **Para o app consumir os dados**, trocar os valores hardcoded por chamadas aos endpoints `/active`:
   - `SUGGESTED_RECIPES` -> `GET /api/admin/featured-recipes/active`
   - `PREMIUM_FEATURES` -> `GET /api/admin/feature-flags/active`
   - `SLIDES` (onboarding) -> `GET /api/admin/onboarding/active`
   - `FREE_LIMITS.recipes` -> `GET /api/admin/settings/plans` (campo `freeRecipeLimit`)
   - Horarios das notificacoes -> `GET /api/notification-templates/active` (campos `scheduleType`, `scheduleHour`, etc.)

Nenhuma configuracao adicional e necessaria. Todas as rotas admin usam o mesmo header `x-admin-secret` ja existente.
