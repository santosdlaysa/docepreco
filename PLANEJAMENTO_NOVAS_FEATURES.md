# Plano Mestre — Plano Master (R$30) + Novas Funcionalidades

Objetivo de negócio: lançar um **3º nível de assinatura "Master" (R$30)**, acima do
Premium atual (R$14,90), cujo diferencial são **3 funcionalidades novas**:
Financeiro, Estoque e Dicas de Vendas. A **Indicação** é transversal (todos os
níveis) — alavanca de aquisição que recompensa com Master.

## Modelo de monetização (definido)

| Nível | Preço | O que inclui |
|-------|-------|--------------|
| Free | R$0 | 3 receitas, básico |
| Premium | R$14,90 | Ilimitado, relatórios, clientes, pedidos (features atuais) |
| **Master** | **R$30** | Tudo do Premium **+ Financeiro + Estoque + Dicas de Vendas** |

- **Indicação**: disponível em **todos os níveis**; recompensa = +30 dias de Master.
- Cobrança: **PIX manual + lojas (RevenueCat)**, nas modalidades **mensal e anual**.
- Hoje o sistema é **binário** (`is_premium`). Master exige migrar para
  **`plan_tier` (free/premium/master)** — refactor que toca banco, RevenueCat,
  webhook, PIX e paywall.

## Ordem mestre de execução

0. **Fundação de tiers + conserto do RevenueCat** ← pré-requisito para cobrar
1. 🎁 Indicação
2. 💰 Financeiro
3. 📦 Estoque (faseado)
4. 📚 Dicas de Vendas

> As features 1–4 são construíveis isoladamente, mas só geram receita depois da
> Fundação (0), que é o que destrava o tier Master e o gating.

---

## 0. ⚙️ Fundação: 3 tiers + RevenueCat (PRÉ-REQUISITO)

### 0a. Consertar RevenueCat (URGENTE — sangra receita hoje)
⚠️ Webhooks do RevenueCat **não eram processados em produção**: renovações de loja
não chegavam e o premium expirava silenciosamente. Afeta o **Premium atual**,
independente do Master. Corrigir **antes** de vender Master pela loja.

**Diagnóstico (2026-06-03):** a secret `REVENUECAT_WEBHOOK_SECRET` ESTÁ configurada
na produção (teste sem auth → 401; com auth e UUID válido → 200). A causa real era
um **crash 500**: quando o `app_user_id`/`original_app_user_id`/alias vinha como ID
anônimo (`$RCAnonymousID:...`), `PostgresUserRepository.findById` fazia
`WHERE id = $1` numa coluna UUID e o Postgres lançava `invalid input syntax for type
uuid`. RevenueCat reentregava, sempre 500, e desistia → `premium_events` com
`source='webhook'` = 0 e `revenuecat_aliases` = 0 linhas.

- [x] **Correção aplicada:** guard de UUID em `findById`/`findByIdFull` (retorna
  `null` para não-UUID em vez de estourar), deixando o fluxo cair na tabela
  `revenuecat_aliases` (VARCHAR), como o handler já esperava.
- [ ] **Deploy na Render** (sem deploy a correção não vale).
- [ ] Após deploy: re-testar o endpoint com payload `$RCAnonymousID` (deve dar 200),
  ou usar "Send test event" no dashboard e conferir log `[Premium] Webhook ...`.
- [ ] Reenviar eventos passados no RevenueCat para recuperar renovações perdidas.

### 0b. Migrar binário → 3 tiers  ✅ BACKEND FEITO (2026-06-03)
- [x] **Banco** (`migrate.ts`): coluna `plan_tier VARCHAR(20) NOT NULL DEFAULT
  'free'` (no CREATE e via `addColumnIfMissing`) + backfill idempotente
  `UPDATE users SET plan_tier='premium' WHERE is_premium=TRUE AND plan_tier='free'`.
  `is_premium` mantido por compatibilidade (sempre em sincronia com o tier).
- [x] **Entidade** `User.ts`: `PlanTier = 'free'|'premium'|'master'` + `planTier`.
- [x] **`PostgresUserRepository`**: `mapRow.planTier` + `updatePlanTier(userId,
  tier, until, platform)`. `updatePremiumStatus` (legado) virou shim **à prova de
  rebaixar Master** (CASE WHEN plan_tier='master' THEN 'master' ELSE 'premium'),
  protegendo Master quando sync/PIX/admin concedem premium genérico.
- [x] **`domain/services/premium.ts`**: add `getActiveTier(user)` e
  `hasTier(user, tier)` (respeitam expiração). `isActivePremium` mantido.
- [ ] Pendente: trocar `FREE_LIMITS` por `TIER_LIMITS` (só quando as features
  Master existirem e precisarem de gating por tier).

### 0c. RevenueCat multi-produto
- Produtos reais já criados no dashboard (status em 2026-06-03):
  - `premium_master` — Master **mensal** (R$30) — *Waiting for Review*
  - `premium_master_anual` — Master **anual**
  - (Premium atual: `premium_monthly` e o anual; permanecem inalterados.)
- ⚠️ Os IDs do Master contêm **"premium"** E **"master"**. O mapeamento
  `product_id` → tier DEVE testar `"master"` **primeiro**:
  `product_id.includes('master') ? 'master' : 'premium'`. Inverter a ordem
  (checar `'premium'` antes) classificaria o Master como Premium.
- [x] `PremiumController.revenueCatWebhook` ✅ (2026-06-03): helper `productToTier`
  (testa `"master"` primeiro) + INITIAL_PURCHASE/RENEWAL/UNCANCELLATION/
  PRODUCT_CHANGE/NON_RENEWING/TRANSFER → `updatePlanTier(tier,...)`;
  EXPIRATION/BILLING_ISSUE → `updatePlanTier('free',...)`.
- [ ] Mobile `revenueCat.ts`: reconhecer os pacotes `premium_master`/
  `premium_master_anual` nas offerings; paywall escolhe. **(0e — pendente)**

### 0d. PIX por tier
- `pix_requests.plan_label` já existe; usar para distinguir Premium vs Master.
- `PixController.approveRequest`: aceitar `planTier` no body e gravar via
  `updatePlanTier` em vez de premium genérico.
- App de PIX (`pixApi`): enviar o tier escolhido.

### 0e. Config + paywall
- `app_settings`: add `plan_master_price`, `plan_master_features`,
  `plan_pix_monthly_master`, `plan_pix_annual_master`.
- `PlanConfigController` + `PlanConfigPage`: seção "Plano Master".
- Mobile `limits.ts`: trocar `PREMIUM_FEATURES` por `FEATURES_BY_TIER`
  (master = premium + 4 novas). Paywall passa a mostrar **3 colunas**.
- `PremiumContext` + `usePaywall`: expor `tier` e helper `requireTier('master')`.

### Riscos da fundação
- Quebra de compatibilidade `is_premium` → `plan_tier`: migração com backfill e
  manter `is_premium` derivado evita downgrade acidental de quem já paga.
- RevenueCat: testar webhook em sandbox antes; downgrade master→premium na expiração.
- Grandfathering: definir o que acontece com quem já é premium (mantém R$14,90).

---

## 1. 🎁 Programa de Indicação ("5 indicações = 1 mês grátis")

> ✅ **IMPLEMENTADO** (backend + mobile + admin). Pendências: rodar `npm run migrate`;
> a recompensa concede premium atual via `is_premium` — quando a Fundação 3-tier (0b)
> existir, trocar o `UPDATE` em `PostgresReferralRepository.grantRewardIfEligible`
> (marcado com `TODO(fundação 3-tier)`) para `plan_tier='master'`.

### Regra de negócio (definida)
- **Aberto a TODOS os usuários** (free, premium e master) — é alavanca de aquisição,
  não feature restrita. A tela "Indique e ganhe" aparece para todo mundo.
- A cada **5 indicações válidas**, o indicador ganha **+30 dias de Master**
  (degustação do topo, incentiva upgrade). Estende via `updatePlanTier(..., 'master', ...)`,
  usando `base = max(now, premium_until)` e `GREATEST` no SQL.
- Indicação fica **válida** quando o indicado **cria a 1ª receita**.

### Modelo de dados
- Coluna `users.referral_code VARCHAR(8) UNIQUE` (base32 sem ambíguos; lazy + retry).
- Tabela `referrals`: `id`, `referrer_id`, `referred_id`, `referral_code`,
  `status` (`pending|valid|rewarded|invalid`), `activated_at`, `rewarded_at`,
  `reward_event_id`, `created_at`. `UNIQUE(referred_id)`. Índices
  `(referrer_id, status)`, `(referred_id)`.
- Recompensa grava `premium_events` (`event_type='REFERRAL_REWARD'`,
  `source='referral'`).

### Backend
- `domain/services/referral.ts`, `PostgresReferralRepository`, `ReferralController`,
  `referralRoutes` (registrar em `server.ts`).
- Cadastro: estender `AuthController.register` (`referralCode`, best-effort,
  `ON CONFLICT (referred_id) DO NOTHING`).
- Ativação: em `RecipeController.create`, `count === 0` → `activateReferral` (FAF).
- Recompensa: `checkAndGrantReward` transacional (`FOR UPDATE`), estende tier,
  `premium_events`, push.
- Endpoints: `GET /api/referrals/me|progress`, admin `.../referrals(+/stats)`,
  `.../:id/invalidate|force-valid`.

### Mobile / Web
- App: campo de código no `RegisterScreen`; tela `ReferralScreen` (código,
  compartilhar, barra X/5, histórico). Admin: `ReferralsPage` (molde `PixRequestsPage`).

### Riscos
- Corrida na recompensa → `FOR UPDATE`. Auto-indicação/multi-conta → bloquear
  `referrer==referred` + heurística + flag admin. Privacidade do email do indicado.

---

## 2. 💰 Gestão Financeira (Despesas + DRE) — feature Master

- **Tabela nova `expenses`** (NÃO reusar `cash_movements`). Campos: `description`,
  `amount DECIMAL(10,2)`, `category`, `cost_type` (fixa/variável), `is_recurring`,
  `recurrence_day`, `expense_date DATE`, `notes`. Índices `(user_id, expense_date)`
  e `(user_id, category)`. **Moeda em reais `DECIMAL(10,2)`** (bate com `sales`).
- **DRE**: `GET /api/finance/summary` (vendas − despesas = lucro, vs meta de
  `revenue_goals`) e `/summary/trend?months=6` (usar `generate_series`). **Agregar
  no Postgres** (`DATE_TRUNC`), nunca no JS (bug de fuso).
- Backend: `Expense.ts`, `IExpenseRepository`, `PostgresExpenseRepository`,
  `ExpenseController` (CRUD), `FinanceController` (summary/trend), rotas
  `/api/expenses` e `/api/finance`.
- Mobile: `CreateExpenseScreen` + `ExpensesScreen` + `FinanceDashboardScreen`
  (3 cards + gráfico de barras estilo `ReportsScreen`). **Gating Master.** Mocks
  em `demoApi.ts`.
- Riscos: recorrência no MVP é só etiqueta (sem job); divisão por zero em margem/meta.

---

## 3. 📦 Controle de Estoque — feature Master (faseado)

- **Modelo**: colunas `stock_qty`, `min_stock`, `track_stock` (default FALSE) em
  `ingredients` + ledger `stock_movements` (`type`: entrada/saida/ajuste/venda/
  estorno_venda; `quantity`>0 na unidade base; `balance_after`; `sale_id` ON DELETE
  SET NULL).
- **Baixa automática (DEFINIDO)**: `quantity_sold` = **unidades do produto final**,
  então consumo = `convertUnit(ri.quantity_used / recipe.yield, ri.unit,
  ingredient.unit) * quantitySold`. ⚠️ **Não esquecer o `/ recipe.yield`.**
  Plugar em `PostgresSaleRepository.create` (transacional) via
  `ConsumeStockForSaleUseCase`; estorno na `.delete`.
- Unidades de famílias diferentes → não baixar, retornar `stockWarnings`. Estoque
  negativo permitido (só avisa). Concorrência → `UPDATE ... stock_qty = stock_qty +
  $delta RETURNING`. Sub-receitas recursivas (fase 2).
- Backend: `StockMovement.ts`, `IStockRepository`, `PostgresStockRepository`,
  `AddStockMovementUseCase`, `ConsumeStockForSaleUseCase`, `StockController`,
  `stockRoutes`. Endpoints: `GET /api/stock|/low|/:id/movements`,
  `POST /api/stock/:id/entry|exit|adjust`.
- Alerta de baixo estoque: cron diário reusando `pushService` + tabela
  `stock_alerts_sent` (anti-spam).
- Mobile: `StockScreen`, `StockMovementScreen`, `stockApi`. **Gating Master.**
- Fases: 0 migração · 1 estoque manual · 2 baixa automática · 3 sub-receitas + admin.

---

## 4. 📚 Dicas de Vendas / Educação — feature Master

- **Tabela nova `sales_tips`** (NÃO estender `motivational_tips`, que é só push).
  Campos: `title`, `summary`, `body TEXT`, `category` (vendas/precificacao/
  marketing/gestao), `image_url`, `is_premium`, `is_active`, `sort_order`.
  Molde: `featured_recipes`.
- Backend: `PostgresSalesTipRepository`, `SalesTipController`, `salesTipRoutes`
  (`/api/sales-tips`). `getActive` esconde `body` de quem não tem o tier (gate no
  servidor).
- Mobile: `SalesTipsScreen` + `SalesTipDetailScreen`; entrada por tile no
  `HomeScreen`. **Conteúdo aprofundado gated em Master**; pode ter 1-2 grátis de
  degustação. `salesTipApi` + `demoSalesTipApi`.
- Web: `SalesTipsPage` (molde `FeaturedRecipesPage`) registrada no `AdminApp`.
- Seed inicial: 10 dicas (precificação 4, vendas 3, marketing 2, gestão 1).

---

## Pontos transversais
- Sincronizar tiers/chaves entre `mobile/.../limits.ts` e `backend/.../premium.ts`.
- Migrações idempotentes (`CREATE TABLE IF NOT EXISTS` + `addColumnIfMissing`).
- Efeitos colaterais (ativação de indicação, baixa de estoque) fire-and-forget /
  transacionais, sem quebrar cadastro/venda.
- Testar RevenueCat em sandbox antes de habilitar Master nas lojas.
