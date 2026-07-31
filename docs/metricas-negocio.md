# Métricas de Negócio — Doce Preço

Documentação de como medir a saúde do negócio: onde cada número vive no banco, como
calculá-lo e um retrato do momento atual.

> **Snapshot dos dados:** 28/07/2026 (produção — banco `sweetpricing` na Render).
> Para atualizar, rode o script da seção [Como gerar o relatório](#como-gerar-o-relatório).

---

## Resumo executivo (28/07/2026)

| Indicador | Valor |
|---|---|
| Total de contas | **870** |
| Assinantes ativos (pagantes) | **34** (21 Premium + 14 Master) |
| Taxa de conversão | **3,9%** |
| Receita de assinaturas no mês (julho, parcial) | **R$ 535,39** |
| Receita no mês anterior (junho, fechado) | R$ 308,23 |
| Receita total já arrecadada | R$ 898,52 |
| Novos usuários nos últimos 30 dias | **273** |
| Receitas precificadas | **981** |
| Encomendas geradas | 148 (106 manuais + 42 loja online) |
| Dinheiro movimentado pelos clientes (GMV) | **R$ 64.081,02** |

---

## Infraestrutura de dados

- **Banco:** PostgreSQL (`sweetpricing`), hospedado na Render.
- **Connection string:** variável de ambiente `DATABASE_URL` em `backend/.env`.
- **Pool de conexão:** `backend/src/infrastructure/database/connection.ts`.
- **Schema:** não há arquivo `.sql`; todas as tabelas são criadas/evoluídas em
  `backend/src/infrastructure/database/migrate.ts` (função `runMigrations`).
- **Acesso admin:** rotas `/api/admin/*`, protegidas por
  `backend/src/presentation/middleware/adminMiddleware.ts` (header `x-admin-secret`
  igual a `DOCEPRECO_ADMIN_SECRET`, ou JWT de um usuário cujo e-mail seja `ADMIN_EMAIL`).
- **Query ad-hoc:** `POST /api/admin/db/query` (`AdminController.executeQuery`) permite
  rodar SQL livre para relatórios pontuais.

---

## Métricas

### 1. Total de usuários

- **Definição:** número de contas cadastradas.
- **Tabela:** `users` (contagem de linhas). Colunas úteis: `id`, `created_at`.
- **Endpoint pronto:** `GET /api/admin/stats` → campo `totalUsers`.
- **Query:**
  ```sql
  SELECT COUNT(*)::int FROM users;
  ```
- **Valor atual:** **870**.

### 2. Pagantes (assinantes ativos)

- **Definição:** usuários com plano pago vigente (Premium ou Master).
- **Tabela:** `users` — colunas `is_premium` (BOOLEAN), `plan_tier`
  (`'free' | 'premium' | 'master'`), `premium_until` (TIMESTAMP), `premium_platform`.
- **Modelagem:** um cron de expiração zera `is_premium` e volta `plan_tier` para `'free'`
  quando `premium_until` vence. Para contar **ativos de verdade**, filtre também por
  `premium_until > NOW()` — a flag pode ficar defasada até o cron rodar.
- **Endpoints prontos:**
  - `GET /api/admin/stats` → `premiumUsers`, `masterUsers`.
  - `GET /api/admin/subscriptions` → `overview.activeSubscribers`, `expiringSubscribers`,
    `expiredSubscribers`, `totalSubscribers`.
- **Queries:**
  ```sql
  -- Assinantes ativos (validade vigente)
  SELECT COUNT(*)::int
  FROM users
  WHERE is_premium = TRUE
    AND (premium_until IS NULL OR premium_until > NOW());

  -- Distribuição por tier
  SELECT plan_tier, COUNT(*)::int
  FROM users
  WHERE is_premium = TRUE
  GROUP BY plan_tier;
  ```
- **Valor atual:** **34 ativos** (21 Premium + 14 Master). Obs.: 35 contas têm a flag
  ligada, mas 1 já venceu — daí 34 vigentes. Conversão = 34 / 870 = **3,9%**.

### 3. Receita mensal (assinaturas / MRR)

- **Definição:** dinheiro arrecadado com assinaturas.
- **Tabela:** `premium_events` — colunas `amount_cents` (INTEGER, em centavos), `currency`
  (`'BRL'`), `event_type`, `created_at`, `expiration_at`, `platform`, `user_id`.
- **Endpoint pronto:** `GET /api/admin/subscriptions` → `overview.mrr`, `overview.arr`,
  `overview.momGrowth`, `monthlyReceivedBRL`, `lastMonthBRL`, `totalReceivedBRL`,
  `byPlatform`, `timeseries` (90 dias).
- **Atenção:** o `mrr` desse endpoint é um **proxy** (caixa reconhecido no mês ÷ assinantes
  ativos), não um MRR contratual clássico. O caixa do mês é `monthlyReceivedCents`.
- **Fontes complementares:** `pix_subscriptions` (assinaturas PIX recorrentes:
  `amount_cents`, `frequency_months`, `status`, `last_charge_at`, exposta em
  `GET /api/admin/pix-subscriptions`) e `pix_requests` (pagamentos PIX avulsos).
- **Query:**
  ```sql
  -- Receita de assinaturas no mês corrente
  SELECT COALESCE(SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END), 0) / 100.0 AS receita_mes
  FROM premium_events
  WHERE created_at >= date_trunc('month', NOW());
  ```
- **Valores atuais:** mês corrente (julho, parcial) **R$ 535,39** · mês anterior (junho)
  R$ 308,23 · total histórico R$ 898,52. Ticket médio ≈ R$ 15,70/assinante.

### 4. Crescimento

- **Definição:** novos cadastros ao longo do tempo.
- **Tabela:** `users.created_at`.
- **Endpoints prontos:** `GET /api/admin/stats` → `newUsersToday`, `newUsersWeek`,
  `newUsersMonth`, `recentUsers`; `GET /api/admin/settings/daily-registration-goal` →
  meta diária + `registeredToday`.
- **Query (série mensal):**
  ```sql
  SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS mes,
         COUNT(*)::int AS novos
  FROM users
  GROUP BY 1
  ORDER BY 1;
  ```
- **Valores atuais:**

  | Mês | Novos cadastros |
  |---|---|
  | Mar/26 | 2 |
  | Abr/26 | 146 |
  | Mai/26 | 237 |
  | Jun/26 | 225 |
  | Jul/26 (parcial) | 260 |

  Hoje: 8 · últimos 7 dias: 92 · últimos 30 dias: 273.

### 5. Receitas precificadas

- **Definição:** receitas cadastradas/precificadas pelos usuários.
- **Tabela:** `recipes` — colunas `id`, `user_id`, `created_at`, `profit_margin`.
  Ingredientes em `recipe_ingredients`. A precificação é calculada em runtime, não há
  tabela separada de "cálculos".
- **Endpoint pronto:** `GET /api/admin/stats` → `totalRecipes`.
- **Query:**
  ```sql
  SELECT COUNT(*)::int FROM recipes;
  ```
- **Valor atual:** **981**.

### 6. Orçamentos gerados

- **⚠️ Limitação:** **não existe** tabela `budgets`/`quotes`. Os orçamentos em PDF são
  gerados no app e **não são persistidos** como entidade. Essa métrica não é rastreável
  no backend hoje — precisaria de instrumentação nova.
- **Proxy mais próximo:** tabela `orders` (encomendas) — colunas `id`, `user_id`,
  `client_name`, `total_price`, `status` (`pending|in_progress|done|delivered|cancelled`),
  `source` (`manual|online`), `created_at`.
- **Query (proxy):**
  ```sql
  SELECT COUNT(*)::int AS total_encomendas FROM orders;
  SELECT source, COUNT(*)::int FROM orders GROUP BY source;
  ```
- **Valor atual (encomendas):** **148** (106 manuais + 42 pela loja online).

### 7. Dinheiro movimentado pelos clientes (GMV)

- **Definição:** faturamento total que os confeiteiros registraram usando o sistema.
- **Tabelas:**
  - `sales` — `total_revenue` (DECIMAL), `quantity_sold`, `sale_price`, `sale_date`,
    `user_id`, `recipe_id` / `product_name`.
  - `orders` — `total_price` (encomendas, fluxo separado de `sales`).
- **Endpoints prontos:** `GET /api/admin/stats` → `totalSales`, `totalRevenue`,
  `revenueThisMonth`, `topByRevenue`. Por usuário: `GET /api/stats` (`StatsController`).
- **Atenção:** `sales` e `orders` são fluxos distintos e **nenhum endpoint soma os dois**.
  Para o GMV consolidado, some as duas fontes manualmente.
- **Queries:**
  ```sql
  SELECT COALESCE(SUM(total_revenue), 0)::float AS gmv_vendas FROM sales;
  SELECT COALESCE(SUM(total_price),  0)::float AS gmv_encomendas FROM orders;
  ```
- **Valores atuais:** vendas R$ 49.087,26 (674 vendas) + encomendas R$ 14.993,76 =
  **R$ 64.081,02** total movimentado.

---

## Tabela de referência rápida

| # | Métrica | Tabela.coluna | Endpoint pronto |
|---|---|---|---|
| 1 | Total de contas | `users` (COUNT) | `/api/admin/stats` → `totalUsers` |
| 2 | Pagantes ativos | `users.is_premium`, `plan_tier`, `premium_until` | `/api/admin/stats`, `/api/admin/subscriptions` |
| 3 | Receita / MRR | `premium_events.amount_cents` | `/api/admin/subscriptions` |
| 4 | Crescimento | `users.created_at` | `/api/admin/stats` |
| 5 | Receitas precificadas | `recipes` (COUNT) | `/api/admin/stats` → `totalRecipes` |
| 6 | Orçamentos | *sem tabela*; proxy `orders` | parcial |
| 7 | GMV | `sales.total_revenue` + `orders.total_price` | `/api/admin/stats` (só `sales`) |

---

## Como gerar o relatório

Um script Node que roda todas as queries de uma vez está descrito abaixo. Rode-o a partir
de `backend/` (onde estão `node_modules` e o `.env` com `DATABASE_URL`):

```bash
cd backend
node caminho/para/report.js
```

O script conecta usando `DATABASE_URL`, executa as queries das seções 1–7 e imprime um
JSON com todos os números. Para relatórios pontuais sem script, use o endpoint admin
`POST /api/admin/db/query` com o SQL desejado.

---

## Ressalvas conhecidas

- **MRR é um proxy** (caixa do mês ÷ assinantes), não MRR contratual.
- **Orçamentos não são persistidos** — o número reportado é de encomendas (`orders`).
- **GMV vem de duas fontes** (`sales` + `orders`) que nenhum endpoint consolida.
- Meses correntes (ex.: julho) são **parciais** até o fim do mês.
- A flag `is_premium` pode ficar defasada até o cron de expiração rodar; filtre por
  `premium_until > NOW()` para contagem exata de ativos.
