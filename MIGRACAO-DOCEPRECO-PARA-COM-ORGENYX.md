# Migração: publicar o Doce Preço na ficha `com.orgenyx`

> Documento de registro do processo realizado em **2026-06-10**.
> Objetivo: publicar o app **Doce Preço** (código em `mobile/`) **dentro da ficha já publicada `com.orgenyx`** no Google Play (é uma **troca** — reaproveitar o slot do antigo app "Orgenyx").

---

## 1. O problema original

Ao enviar o AAB na ficha `com.orgenyx`, o Google Play recusava:

> *"Seu Android App Bundle foi assinado com uma chave incorreta. Ele deveria ser assinado com um certificado com a impressão digital SHA1: `26:B9:...:87`. No entanto, o certificado usado usa SHA1: `70:63:...:36`."*

### Diagnóstico
A **chave de upload** registrada na ficha `com.orgenyx` (`26:B9`) estava **perdida**.

Varredura completa de `C:\Users\ldsantos` (2026-06-10):

| Chave (SHA1) | Onde está | Serve? |
|---|---|---|
| `26:B9:5D:39:DB:EA:E9:F3:03:DF:9C:08:FB:9A:65:25:A7:54:01:87` | **PERDIDA** (não está em disco, git nem EAS) | era a exigida |
| `70:63:BB:F6:C4:85:A9:86:66:5C:88:2A:C4:13:DD:A3:C6:06:33:36` | `mobile/credentials/android/keystore.jks` e cópias (chave do EAS) | ✅ usada agora |
| `09:2E:CC:23:3F:69:CD:31:3A:55:BD:AC:99:6B:D3:FA:B3:71:0C:5F` | `@orgenyx__controle-gastos-app.jks` (EAS do Orgenyx) | ❌ não bate |

- A chave perdida `26:B9` correspondia ao arquivo `sweet-pricing-upload.jks` (referenciado em commits antigos do `build.gradle`), que **não existe mais** e **nunca foi commitado**.
- A mesma `26:B9` era usada como chave de upload de mais de um app (Doce Preço e `com.orgenyx`).

---

## 2. A solução: reset da chave de upload

A ficha `com.orgenyx` usa **Play App Signing** (confirmado no Play Console):
- **Chave de assinatura do app (mestra, com o Google):** SHA1 `89:C0:DE:17:22:34:9D:CE:48:1D:81:E8:F9:26:4B:21:C2:C8:E8:2C` — nunca muda, **usuários não são afetados**.
- **Chave de upload (registrada):** `26:B9...` (perdida).

Como o Play App Signing está ativo, foi possível **solicitar a redefinição da chave de upload**:

- Solicitado em **2026-06-10** com o certificado `mobile/upload_certificate_70-63.pem` (gerado a partir da chave `70:63`).
- O Google informou que a nova chave fica **disponível em 2026-06-12**.
- A partir daí, **AABs assinados com `70:63` serão aceitos** no `com.orgenyx`.

### Como o `.pem` foi gerado
```bash
keytool -export -rfc \
  -keystore "mobile/credentials/android/keystore.jks" \
  -alias "a501f2edacb2772c283d43a8d2ebae05" \
  -storepass "<senha do keystore>" \
  -file "mobile/upload_certificate_70-63.pem"
```

> ⚠️ **NUNCA apagar/sobrescrever** os keystores. O `70:63` (em `mobile/credentials/android/keystore.jks`, também no EAS) passa a ser a chave de upload oficial.

---

## 3. Mudanças no código

### 3.1 Troca de package (`com.laysadiniz.sweetpricing` → `com.orgenyx`)
- `mobile/app.json`: `android.package` = `com.orgenyx`.
  - `ios.bundleIdentifier` **mantido** `com.laysadiniz.sweetpricing` (iOS é app separado na App Store).
- `mobile/android/app/build.gradle`: `applicationId 'com.orgenyx'`.
  - `namespace` **mantido** `com.laysadiniz.sweetpricing` (namespace ≠ applicationId; não afeta o package no Play, evita mover arquivos Kotlin).

### 3.2 Firebase / google-services (push)
- Adicionado o app `com.orgenyx` ao projeto Firebase **`docepreco-810f1`**.
- Novo `google-services.json` (com os dois packages) colocado em **dois lugares**:
  - `mobile/google-services.json`
  - `mobile/android/app/google-services.json` ← **é este que o build lê**
- `googleServicesFile` reativado no `app.json`; plugin `com.google.gms.google-services` e classpath reativados nos `build.gradle`.

### 3.3 Stubs web (corrigem "tela branca" / bundle web)
Módulos nativos não funcionam no bundle web. Criados stubs `.web`:
- `mobile/src/presentation/ads/AdBanner.web.tsx`
- `mobile/src/presentation/ads/useAdInterstitial.web.ts`
- `mobile/src/presentation/ads/AdConsentManager.web.ts`
- `mobile/src/presentation/ads/initMobileAds.web.ts`
- `mobile/src/presentation/utils/uxcam.ts` + `uxcam.web.ts` (UXCam isolado num wrapper; chamada movida do topo do `App.tsx` para `initUxCam()`)

### 3.4 RevenueCat (chave Android + detecção de tier)
- `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` preenchida em `mobile/.env` e `mobile/eas.json` (produção):
  `goog_ZrSThLlBkYoiczMZQxDSAbQSunI`
  > ⚠️ Conferir caractere a caractere com a RevenueCat (o `i` e o `l` são idênticos visualmente). Copiar/colar, não digitar.
- `mobile/src/data/premium/revenueCat.ts` (`mapPackage`): a detecção de tier/período agora olha **o identificador do pacote E do produto** (no Android o produto vem como `premium_master:master`), garantindo Master/Anual corretos no paywall.

### 3.5 Build (correção de Metaspace)
- `mobile/android/gradle.properties`: `org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m` (antes `-Xmx2048m -XX:MaxMetaspaceSize=512m`) — corrigiu falha `Metaspace` no KSP.

---

## 4. Assinaturas (Google Play + RevenueCat)

### 4.1 Google Play — assinaturas criadas na ficha `com.orgenyx`
Modelo novo (Assinatura → Plano base). Produtos (formato `assinatura:planobase`):
- `premium_monthly:mensal` → Premium Mensal
- `premium_annual:anual` → Premium Anual
- `premium_master:master` → Master Mensal
- `premium_master_annual:masteranual` → Master Anual

### 4.2 RevenueCat — reaproveitando o projeto do iOS
**Não foi criado projeto novo.** No mesmo projeto do iOS:
- Adicionado o app **Google Play** (`com.orgenyx`) → gerou a chave `goog_...`.
- Conta de serviço do Google Play autorizada (permissões: ver dados financeiros + gerenciar pedidos/assinaturas) e JSON subido na RevenueCat.
- Produtos importados.
- **Entitlements e Offerings são compartilhados** entre iOS e Android.

### 4.3 Como o app decide premium vs master
- **Backend** (`backend/src/infrastructure/services/revenueCatService.ts`): o tier vem do `product_identifier` — se contém `master` → tier `master`. **Não depende do nome do entitlement** (por isso deixar tudo no entitlement `premium` funciona).
- **App** (`PremiumContext`): o tier vem do backend (`authApi.me()` → `user.planTier`). RevenueCat no app é usado como sincronização de recuperação.

---

## 5. O AAB gerado

- Caminho: `mobile/android/app/build/outputs/bundle/release/app-release.aab`
- `applicationId`: **com.orgenyx** ✅
- Assinatura: **SHA1 70:63** ✅
- Chave RevenueCat embutida: `goog_ZrSThLlBkYoiczMZQxDSAbQSunI` ✅
- `versionCode`: 56 (maior que o do Orgenyx, que era 6 → upload aceito)

Comando de build:
```bash
cd mobile/android && ./gradlew :app:bundleRelease --console=plain
```

---

## 6. Checklist do que falta (a partir de 12/06)

- [ ] **12/06:** confirmar que o reset da chave de upload está ativo no Play Console.
- [ ] **Enviar o AAB** na ficha `com.orgenyx` (faixa de teste interno primeiro).
- [ ] **Conferir a chave `goog_`** (copy-paste vs RevenueCat) — se diferente, corrigir `.env`/`eas.json` e rebuildar.
- [ ] **Testar uma compra** real (teste interno) no Android e validar que premium/master desbloqueiam.
- [ ] **Editar a listagem** da Play (`com.orgenyx`) → Doce Preço: nome, ícone, descrição, capturas de tela.
- [ ] **AdMob:** religar/atualizar o package `com.orgenyx` no painel do AdMob (senão anúncios podem não servir).
- [ ] **Push (FCM):** confirmar credenciais FCM da conta de serviço no EAS para o `com.orgenyx` (o `google-services.json` já dá o token; a entrega via Expo precisa das credenciais no EAS).

---

## 7. Atenção / pendências conhecidas

| Item | Situação |
|---|---|
| 🔴 RevenueCat assinaturas | Configurado para `com.orgenyx`; **testar compra real** antes de divulgar |
| 🟡 AdMob | IDs ainda ligados ao package antigo — religar no painel |
| 🟡 Push servidor | Firebase reconfigurado; validar entrega ponta-a-ponta após publicar |
| 🟡 versionCode | 56 (ok agora); lembrar de incrementar a cada novo envio |
| 🟢 Listagem Play | Ainda com textos/prints do Orgenyx — editar para Doce Preço |
| 🟢 iOS | Não afetado (`com.laysadiniz.sweetpricing`) |

---

## 8. Referência rápida de valores

| Item | Valor |
|---|---|
| Package novo (Android) | `com.orgenyx` |
| Bundle iOS (inalterado) | `com.laysadiniz.sweetpricing` |
| Chave de upload (pós-reset) | SHA1 `70:63:BB:F6:C4:85:A9:86:66:5C:88:2A:C4:13:DD:A3:C6:06:33:36` |
| Keystore | `mobile/credentials/android/keystore.jks` (também no EAS) |
| Certificado p/ reset | `mobile/upload_certificate_70-63.pem` |
| Projeto Firebase | `docepreco-810f1` |
| RevenueCat key Android | `goog_ZrSThLlBkYoiczMZQxDSAbQSunI` |
| Reset disponível em | **2026-06-12** |
