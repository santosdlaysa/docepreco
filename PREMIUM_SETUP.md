# DocePreço — Setup do Premium / IAP

Este é o checklist completo para deixar o freemium rodando usando o **RevenueCat** como camada de abstração das compras no app. O código do app e do backend já estão prontos — esse documento é o manual operacional.

## Visão geral da arquitetura

```
Mobile (react-native-purchases)
   │
   ├─▶ Apple App Store IAP
   ├─▶ Google Play Billing
   │
   ▼
RevenueCat
   │  (webhook)
   ▼
Backend API  ────▶  PostgreSQL (users.is_premium, premium_until, premium_platform)
   ▲
   │  GET /api/auth/me
   │
Mobile PremiumContext  ──▶  usePaywall() / checkLimit() / requirePremium()
```

- **Limites do grátis**: 15 ingredientes, 5 receitas (espelhados em `backend/src/domain/services/premium.ts` e `mobile/src/presentation/premium/limits.ts`)
- **Funcionalidades premium**: agenda de encomendas, clientes, PDF sem marca, relatórios completos, cálculo profissional, lista de compras inteligente
- **Fonte da verdade sobre a assinatura**: tabela `users` do backend, alimentada pelo webhook do RevenueCat. O PremiumContext do app sincroniza via `GET /auth/me`.

---

## 1. Conta no RevenueCat

1. Criar uma conta gratuita em <https://app.revenuecat.com>
2. Criar um **Project** → "DocePreço"
3. Dentro do projeto, criar dois **Apps**:
   - `DocePreço iOS` (App Store)
   - `DocePreço Android` (Play Store)
4. Copiar a **public SDK key** de cada plataforma. Vão virar variáveis de ambiente:
   - `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
   - `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`

---

## 2. Google Play — assinatura mensal + anual

1. Abrir **Google Play Console** → app DocePreço → **Monetizar → Produtos → Assinaturas**
2. Criar os planos base:
   - `premium_monthly` — R$ 14,90/mês — base plan ID `monthly-autorenew`
   - `premium_annual` — R$ 89,90/ano — base plan ID `annual-autorenew`
3. Adicionar pelo menos uma oferta e ativar cada assinatura
4. No Play Console → **Configuração → Teste de licença**, adicionar os e-mails que vão testar o fluxo em sandbox
5. No **RevenueCat → Project Settings → Apps → Android**:
   - Enviar o JSON da service account do Play Store (pro RevenueCat conseguir ler as compras)
   - Ligar cada assinatura do Play Store aos produtos no RevenueCat

---

## 3. App Store Connect — assinatura mensal + anual

1. **App Store Connect** → DocePreço → **Features → In-App Purchases → Manage**
2. Criar um **Subscription Group** chamado "DocePreço Premium"
3. Adicionar duas assinaturas auto-renováveis dentro do grupo:
   - `premium_monthly` — R$ 14,90/mês — duração de 1 mês
   - `premium_annual` — R$ 89,90/ano — duração de 1 ano
4. Preencher o screenshot de revisão + descrição de cada assinatura (obrigatório)
5. Em **Users and Access → Sandbox → Testers**, criar Apple IDs de sandbox pros testes
6. No **RevenueCat → Project Settings → Apps → iOS**:
   - Enviar o shared secret do App Store Connect (App Store Connect → Apps → In-App Purchases → App-Specific Shared Secret)
   - Ligar cada assinatura da App Store aos produtos no RevenueCat

---

## 4. RevenueCat — Entitlement + Offering

1. **Entitlements** → criar um chamado `premium`
   - Anexar os produtos `premium_monthly` e `premium_annual` (iOS + Android)
2. **Offerings** → criar uma offering chamada `default`
   - Adicionar o package `$rc_monthly` → produtos `premium_monthly`
   - Adicionar o package `$rc_annual` → produtos `premium_annual`
3. Marcar a offering como **Current**

O `fetchOfferings()` do app (em `mobile/src/data/premium/revenueCat.ts`) lê `offerings.current.availablePackages` e ordena o anual primeiro.

---

## 5. Webhook do RevenueCat → backend

1. Gerar um token aleatório forte, ex.: `openssl rand -hex 32`
2. No **Render** → serviço do backend → **Environment**, definir:
   - `REVENUECAT_WEBHOOK_SECRET=<o token aleatório>`
   - `ADMIN_SECRET=<outro token aleatório>` (usado pro toggle manual de premium)
3. No **RevenueCat → Project Settings → Integrations → Webhooks**:
   - URL: `https://docepreco.onrender.com/api/webhooks/revenuecat`
   - Valor do header de Authorization: `Bearer <REVENUECAT_WEBHOOK_SECRET>`
4. Testar com o botão "Send test event". Conferir nos logs do Render se aparece `[RevenueCat webhook]`.

O handler do webhook fica em `backend/src/presentation/controllers/PremiumController.ts` e processa:
- `INITIAL_PURCHASE`, `RENEWAL`, `UNCANCELLATION`, `PRODUCT_CHANGE`, `NON_RENEWING_PURCHASE` → marca `is_premium = true` e atualiza `premium_until`
- `EXPIRATION`, `CANCELLATION`, `BILLING_ISSUE` → marca `is_premium = false`

---

## 6. Variáveis de ambiente do mobile

Adicionar no `mobile/.env` (ou nos secrets do EAS):

```
EXPO_PUBLIC_API_URL=https://docepreco.onrender.com/api
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_XXXXXXXXXXXX
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_XXXXXXXXXXXX
```

Para builds de produção, adicionar via `eas secret:create` pra que fiquem embarcadas no binário.

---

## 7. Instalar o SDK nativo

Rodar uma vez dentro de `mobile/`:

```bash
npx expo install react-native-purchases
```

Depois rebuildar os projetos nativos:

```bash
npx expo prebuild --clean
eas build --profile development --platform android   # ou ios
```

O wrapper em `mobile/src/data/premium/revenueCat.ts` usa `require` tardio, então o bundle JS ainda funciona antes do pacote nativo ser instalado — ele só reporta `isRevenueCatConfigured() === false` e o paywall mostra um aviso de "não configurado".

---

## 8. Testes em sandbox

### Android
1. Logar no dispositivo com um e-mail de **License tester** (ver passo 2)
2. Instalar uma build de dev (`eas build --profile development --platform android`)
3. Abrir o paywall → escolher um plano → confirmar
4. No Google Play, contas de sandbox mostram "Cartão de teste, sempre aprovado"
5. Verificar:
   - App: tela de Perfil mostra o badge Premium na hora (update otimista)
   - Backend: nos logs do Render aparece `[RevenueCat webhook] INITIAL_PURCHASE` em poucos segundos
   - DB: `SELECT is_premium, premium_until FROM users WHERE id = '<user>'` reflete a mudança

### iOS
1. Sair do seu Apple ID real no dispositivo
2. Instalar via TestFlight ou dev client
3. Abrir o paywall → o prompt de sandbox vai pedir pra logar com um sandbox tester (criado no App Store Connect)
4. Completar a compra — sandbox renova mais rápido pra teste:
   - 1 mês → 5 minutos
   - 1 ano → 1 hora

### Fluxo de restore
Apertar **Restaurar** no header do paywall. Ele chama `restorePurchases()` que sincroniza as entitlements ativas do RevenueCat com a loja.

---

## 9. Toggle manual de premium (admin / suporte)

Pra casos de suporte (reembolso, conta cortesia, etc.):

```bash
curl -X POST https://docepreco.onrender.com/api/admin/users/<userId>/premium \
  -H "X-Admin-Secret: <ADMIN_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"isPremium": true, "premiumUntil": "2026-12-31T00:00:00Z", "premiumPlatform": "manual"}'
```

Passar `"isPremium": false` pra revogar.

---

## 10. Checklist de lançamento

- [ ] Conta + apps criados no RevenueCat
- [ ] Assinaturas no Play Store ativas
- [ ] Assinaturas no App Store enviadas com screenshots
- [ ] Entitlement + offering ativos no RevenueCat
- [ ] Webhook configurado e test event recebido
- [ ] Variáveis de ambiente do backend no Render (`REVENUECAT_WEBHOOK_SECRET`, `ADMIN_SECRET`)
- [ ] Variáveis de ambiente do mobile no EAS (`EXPO_PUBLIC_REVENUECAT_*_KEY`)
- [ ] `react-native-purchases` instalado e com prebuild rodado
- [ ] Compra em sandbox validada ponta a ponta (Android + iOS)
- [ ] Restore de compras validado
- [ ] Banco refletindo os updates do webhook
- [ ] Limites do grátis validados (tentar criar o 16º ingrediente / 6ª receita → paywall abre)
- [ ] Badge Premium aparece na tela de Perfil pra assinantes ativos

---

## Mapa de arquivos (onde fica cada coisa)

**Backend**
- `backend/src/domain/services/premium.ts` — `FREE_LIMITS`, `isActivePremium`, `canCreateMore`
- `backend/src/infrastructure/repositories/PostgresUserRepository.ts` — `updatePremiumStatus`, `countIngredients`, `countRecipes`
- `backend/src/presentation/controllers/PremiumController.ts` — webhook + endpoint admin
- `backend/src/presentation/routes/premiumRoutes.ts` — rotas
- `backend/src/presentation/controllers/IngredientController.ts` + `RecipeController.ts` — enforcement de limite no create

**Mobile**
- `mobile/src/data/premium/revenueCat.ts` — wrapper do SDK do RC (`configureRevenueCat`, `fetchOfferings`, `purchasePackage`, `restorePurchases`, `identifyRevenueCatUser`, `logoutRevenueCatUser`)
- `mobile/src/presentation/context/PremiumContext.tsx` — hook `usePremium()` + provider
- `mobile/src/presentation/premium/limits.ts` — limites client-side + copy das features
- `mobile/src/presentation/premium/usePaywall.ts` — helpers `checkLimit` / `requirePremium`
- `mobile/src/presentation/screens/PaywallScreen.tsx` — UI do paywall
- `mobile/src/presentation/screens/ProfileScreen.tsx` — badge / CTA de premium
- `mobile/src/presentation/screens/CreateIngredientScreen.tsx` + `CreateRecipeScreen.tsx` — checagem client-side + fallback do 403 do backend
