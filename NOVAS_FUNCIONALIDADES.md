# DocePreco - Novas Funcionalidades do Painel Admin

Data: 27/04/2026

---

## Resumo

Foram implementadas **10 novas funcionalidades** no painel admin web que controlam o app mobile DocePreco remotamente. Cada funcionalidade possui:

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

**Arquivos criados:**
- `backend/src/infrastructure/repositories/PostgresGlobalIngredientRepository.ts`
- `backend/src/presentation/controllers/GlobalIngredientController.ts`
- `backend/src/presentation/routes/globalIngredientRoutes.ts`
- `web/src/pages/GlobalIngredientsPage.tsx`

---

## 2. Receitas Sugeridas (Premium)

**O que e:** Receitas prontas com ingredientes, quantidades e precos que usuarios premium podem usar como base. Substitui o array `SUGGESTED_RECIPES` que estava hardcoded no app.

**Por que:** Antes as 12 receitas sugeridas (Brigadeiro, Bolo de Cenoura, Brownie, etc.) estavam fixas no codigo do app. Agora podem ser gerenciadas pelo painel sem precisar de update na App Store.

**Funcionalidades do painel:**
- Criar, editar e excluir receitas com ingredientes completos
- Cada receita tem: nome, rendimento (unidades), margem de lucro (%), ordem
- Cada ingrediente tem: nome, quantidade usada, unidade, quantidade da embalagem, preco de compra
- Expandir receita para ver tabela de ingredientes
- Ativar/desativar receitas individualmente

**Endpoints:**
- `GET /api/admin/featured-recipes` - listar todas (admin)
- `GET /api/admin/featured-recipes/active` - listar ativas (app)
- `POST /api/admin/featured-recipes` - criar com ingredientes (admin)
- `PUT /api/admin/featured-recipes/:id` - atualizar com ingredientes (admin)
- `DELETE /api/admin/featured-recipes/:id` - excluir em cascata (admin)

**Tabelas:** `featured_recipes` + `featured_recipe_ingredients`

**Arquivos criados:**
- `backend/src/infrastructure/repositories/PostgresFeaturedRecipeRepository.ts`
- `backend/src/presentation/controllers/FeaturedRecipeController.ts`
- `backend/src/presentation/routes/featuredRecipeRoutes.ts`
- `web/src/pages/FeaturedRecipesPage.tsx`

---

## 3. Configuracao de Planos

**O que e:** Controle centralizado dos limites e precos dos planos Free e Premium.

**Por que:** Antes o limite de receitas gratuitas (5) e o preco do premium (R$ 14,90) estavam hardcoded no app. Agora podem ser alterados pelo painel e o app consulta os valores atualizados.

**Funcionalidades do painel:**
- Alterar limite de receitas do plano Free
- Alterar preco mensal do plano Premium
- Gerenciar lista de funcionalidades do plano Free (adicionar/remover)
- Gerenciar lista de funcionalidades do plano Premium (adicionar/remover)
- Valores padrao caso nao tenha sido configurado

**Endpoints:**
- `GET /api/admin/settings/plans` - ler configuracao (app + admin)
- `PUT /api/admin/settings/plans` - atualizar configuracao (admin)

**Armazenamento:** Tabela `app_settings` (key-value), chaves: `plan_free_recipe_limit`, `plan_premium_price`, `plan_free_features`, `plan_premium_features`

**Arquivos criados:**
- `backend/src/presentation/controllers/PlanConfigController.ts`
- `backend/src/presentation/routes/planConfigRoutes.ts`
- `web/src/pages/PlanConfigPage.tsx`

---

## 4. Feature Flags

**O que e:** Sistema de liga/desliga de funcionalidades do app remotamente, sem precisar de update na App Store.

**Por que:** Permite lancar funcionalidades gradualmente, desativar features com bug em producao, ou fazer A/B testing.

**Funcionalidades do painel:**
- Toggle visual ON/OFF para cada flag
- Criar novas flags com chave unica e descricao
- Editar descricao e estado
- Excluir flags
- Chave formatada automaticamente (lowercase, underscores)

**Flags pre-populadas no primeiro boot:**

| Chave | Descricao |
|-------|-----------|
| `pdfCustomBranding` | PDF personalizado - logo, cores e sem marca DocePreco |
| `advancedReports` | Relatorios completos - graficos de faturamento e margem real |
| `clientsManagement` | Gestao de clientes - cadastro, historico e aniversarios |
| `ordersManagement` | Agenda de encomendas - pedidos, producao e lembretes |
| `laborCostCalc` | Calculo profissional - mao de obra e custos fixos |
| `smartShoppingList` | Lista de compras inteligente |
| `ingredientPriceHistory` | Historico de precos dos ingredientes |
| `seasonalPricing` | Precificacao por temporada |
| `suggestedRecipes` | Receitas sugeridas premium |

**Endpoints:**
- `GET /api/admin/feature-flags` - listar todas (admin)
- `GET /api/admin/feature-flags/active` - listar ativas (app)
- `POST /api/admin/feature-flags` - criar (admin)
- `PUT /api/admin/feature-flags/:id` - atualizar (admin)
- `DELETE /api/admin/feature-flags/:id` - excluir (admin)

**Tabela:** `feature_flags`

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
- Status automatico: Ativo, Inativo, Expirado, Esgotado
- Ativar/desativar cupons
- Contador de usos em tempo real
- Usos ilimitados (maxUses = 0) ou limitados

**Endpoints:**
- `GET /api/admin/coupons` - listar todos (admin)
- `GET /api/admin/coupons/validate/:code` - validar cupom (app)
- `POST /api/admin/coupons` - criar (admin)
- `PUT /api/admin/coupons/:id` - atualizar (admin)
- `DELETE /api/admin/coupons/:id` - excluir (admin)

**Tabela:** `coupons`

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
  - Confeitaria: bolo, cupcake, chocolate, biscoito, torta, donut, pudim
  - Bebidas: cafe, suco, drinks
  - Salgados: pao, fritura, pizza
  - Sazonais: Natal, Pascoa, Namorados, festas
  - Especiais: infantil, premium, destaque, populares
- Clique no emoji ja preenche o nome sugerido
- Campo manual para digitar qualquer emoji
- Preview do emoji selecionado em tamanho grande
- Ordenacao e ativar/desativar

**Endpoints:**
- `GET /api/admin/categories` - listar todas (admin)
- `GET /api/admin/categories/active` - listar ativas (app)
- `POST /api/admin/categories` - criar (admin)
- `PUT /api/admin/categories/:id` - atualizar (admin)
- `DELETE /api/admin/categories/:id` - excluir (admin)

**Tabela:** `recipe_categories`

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
- Lista de feedbacks com nota em estrelas, mensagem e dados do usuario
- Filtros por status: Todos, Pendente, Lido, Respondido
- Cards de metricas: total, pendentes, nota media, respondidos
- Marcar como lido
- Responder feedback (resposta aparece inline com borda lateral)
- Destaque visual para feedbacks pendentes

**Endpoints:**
- `GET /api/admin/feedbacks` - listar todos (admin)
- `POST /api/admin/feedbacks` - enviar feedback (app, autenticado)
- `PUT /api/admin/feedbacks/:id` - atualizar status (admin)
- `POST /api/admin/feedbacks/:id/reply` - responder (admin)

**Tabela:** `feedbacks`

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
- Lista de funcionalidades/mudancas (adicionar/remover dinamicamente)
- Ativar/desativar visibilidade (ocultar versoes antigas)
- Exibicao cronologica com badge de versao

**Endpoints:**
- `GET /api/admin/changelog` - listar todos (admin)
- `GET /api/admin/changelog/active` - listar ativos (app)
- `POST /api/admin/changelog` - criar (admin)
- `PUT /api/admin/changelog/:id` - atualizar (admin)
- `DELETE /api/admin/changelog/:id` - excluir (admin)

**Tabela:** `changelog_entries` (usa `TEXT[]` do PostgreSQL para a lista de features)

**Arquivos criados:**
- `backend/src/infrastructure/repositories/PostgresChangelogRepository.ts`
- `backend/src/presentation/controllers/ChangelogController.ts`
- `backend/src/presentation/routes/changelogRoutes.ts`
- `web/src/pages/ChangelogPage.tsx`

---

## 10. Onboarding

**O que e:** Telas de boas-vindas que aparecem no primeiro acesso do usuario ao app. Sao as telas de "deslizar" que explicam o app.

**Por que:** Antes as 4 telas estavam hardcoded no app. Agora podem ser editadas, reordenadas, ativadas/desativadas e novas telas podem ser adicionadas sem update.

**Funcionalidades do painel:**
- Criar, editar e excluir etapas de onboarding
- Seletor visual com 16 icones pre-configurados (Ionicons)
- Color picker nativo para cor do icone e cor de fundo
- Campo manual para digitar qualquer nome de icone Ionicons
- Preview de celular interativo com navegacao entre telas
- Indicador de pagina (dots) no preview
- Ordenacao e ativar/desativar

**Telas pre-populadas no primeiro boot:**

| # | Titulo | Icone | Cor |
|---|--------|-------|-----|
| 1 | Voce sabe se esta lucrando? | sad-outline | Rosa |
| 2 | Calcule o custo real de cada receita | calculator-outline | Marrom |
| 3 | Defina sua margem de lucro | trending-up-outline | Verde |
| 4 | Acompanhe suas vendas | cash-outline | Laranja |

**Endpoints:**
- `GET /api/admin/onboarding` - listar todas (admin)
- `GET /api/admin/onboarding/active` - listar ativas (app)
- `POST /api/admin/onboarding` - criar (admin)
- `PUT /api/admin/onboarding/:id` - atualizar (admin)
- `DELETE /api/admin/onboarding/:id` - excluir (admin)

**Tabela:** `onboarding_steps` (colunas: icon, icon_color, icon_bg)

**Arquivos criados:**
- `backend/src/infrastructure/repositories/PostgresOnboardingRepository.ts`
- `backend/src/presentation/controllers/OnboardingController.ts`
- `backend/src/presentation/routes/onboardingRoutes.ts`
- `web/src/pages/OnboardingPage.tsx`

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
- Dicas (motivacionais)
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

### Backend (30 arquivos novos/modificados)
- 1 migration atualizada (`migrate.ts`) com 10 tabelas novas
- 9 repositories novos
- 10 controllers novos
- 10 route files novos
- 1 server.ts atualizado (registro das rotas)

### Frontend Web (11 arquivos novos/modificados)
- 10 paginas novas
- 1 api.ts atualizado (tipos + endpoints)
- 1 AdminApp.tsx atualizado (navegacao + imports)

### Tabelas PostgreSQL criadas
1. `global_ingredients`
2. `featured_recipes`
3. `featured_recipe_ingredients`
4. `recipe_categories`
5. `feature_flags`
6. `faq_items`
7. `coupons`
8. `feedbacks`
9. `changelog_entries`
10. `onboarding_steps`

### Seeds automaticos (primeiro boot)
- 9 feature flags (funcionalidades premium existentes)
- 4 etapas de onboarding (telas atuais do app)

---

## Como usar

1. Reiniciar o backend - as migrations criam as tabelas e seeds automaticamente
2. Acessar o painel admin - as novas paginas ja aparecem na sidebar
3. Para o app consumir os dados, trocar os valores hardcoded por chamadas aos endpoints `/active`

Nenhuma configuracao adicional e necessaria. Todas as rotas admin usam o mesmo header `x-admin-secret` ja existente.
