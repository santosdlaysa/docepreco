# Anuncios Banner (Google AdMob) - Plano Gratuito

## Objetivo

Monetizar usuarios do plano gratuito exibindo banners do Google AdMob nas telas principais do app. Usuarios premium nao veem anuncios.

---

## Tipo de anuncio

**Banner adaptivo** - faixa horizontal que se ajusta a largura da tela (~50-80px de altura). Aparece inline no conteudo (scrolla junto), nao e overlay fixo.

---

## Onde exibir

| Tela | Posicao | Arquivo |
|------|---------|---------|
| **Home** | Entre a secao de insights e "Acesso Rapido" | `screens/HomeScreen.tsx` |
| **Receitas** | No topo da lista, apos o info card e barra de progresso | `screens/RecipesScreen.tsx` |
| **Ingredientes** | No topo da lista, apos o info card | `screens/IngredientsScreen.tsx` |

---

## Regras de exibicao

- **Mostrar apenas para usuarios gratuitos** (checar `isPremium` do `PremiumContext`)
- **Nao mostrar em modo demo** (checar `isDemoMode()`)
- **Se o anuncio falhar ao carregar**, nao exibir nada (sem erro visivel)
- **Consentimento LGPD**: exibir dialog de consentimento na primeira abertura do app

---

## Biblioteca

**`react-native-google-mobile-ads`** v15+

- Unica biblioteca mantida para AdMob + React Native
- Tem config plugin oficial para Expo
- Requer build nativo (EAS Build, nao funciona com Expo Go)
- Ja tem suporte ao UMP SDK para consentimento LGPD/GDPR

---

## Configuracao necessaria

### app.json

Adicionar plugin com os app IDs do AdMob:

```json
"plugins": [
  ["expo-notifications", { "color": "#E91E8C" }],
  [
    "react-native-google-mobile-ads",
    {
      "androidAppId": "ca-app-pub-XXXXX~YYYYY",
      "iosAppId": "ca-app-pub-XXXXX~ZZZZZ"
    }
  ]
]
```

### eas.json

Adicionar env vars com os ad unit IDs nos profiles de build:

```json
"production": {
  "env": {
    "EXPO_PUBLIC_ADMOB_BANNER_ANDROID": "ca-app-pub-xxx/banner-android",
    "EXPO_PUBLIC_ADMOB_BANNER_IOS": "ca-app-pub-xxx/banner-ios"
  }
}
```

### IDs de teste (desenvolvimento)

- Android: `ca-app-pub-3940256099942544/9214589741`
- iOS: `ca-app-pub-3940256099942544/2435281174`

---

## Arquivos a criar

### `src/presentation/ads/AdConfig.ts`

Constantes com ad unit IDs. Em `__DEV__` usa IDs de teste, em producao usa env vars.

### `src/presentation/ads/AdBanner.tsx`

Componente reutilizavel:
- Renderiza `BannerAd` com tamanho `ANCHORED_ADAPTIVE_BANNER`
- Internamente checa `usePremium()` e `isDemoMode()` - retorna `null` se premium ou demo
- Trata erros silenciosamente
- Estilo: `marginVertical: 12`, background `#FFF0F3`

### `src/presentation/ads/AdConsentManager.ts`

Gerencia consentimento LGPD usando `AdsConsent` do SDK. Chamado uma vez no startup do app.

### `src/presentation/ads/index.ts`

Re-exporta os modulos publicos.

---

## Arquivos a modificar

| Arquivo | Mudanca |
|---------|---------|
| `package.json` | Adicionar `react-native-google-mobile-ads` |
| `app.json` | Adicionar config plugin com app IDs |
| `eas.json` | Adicionar env vars com ad unit IDs |
| `navigation/AppNavigator.tsx` | Inicializar SDK (`mobileAds().initialize()`) e consentimento no startup |
| `screens/HomeScreen.tsx` | Inserir `<AdBanner />` |
| `screens/RecipesScreen.tsx` | Inserir `<AdBanner />` no `ListHeaderComponent` |
| `screens/IngredientsScreen.tsx` | Inserir `<AdBanner />` no `ListHeaderComponent` |

---

## Ordem de implementacao

1. Instalar dependencia (`npx expo install react-native-google-mobile-ads`)
2. Configurar `app.json` com plugin e app IDs
3. Configurar `eas.json` com env vars
4. Criar `AdConfig.ts`
5. Criar `AdBanner.tsx`
6. Criar `AdConsentManager.ts`
7. Modificar `AppNavigator.tsx` (inicializacao)
8. Inserir `<AdBanner />` nas 3 telas
9. Build de desenvolvimento e testar
10. Substituir IDs de teste por producao

---

## Verificacao

- [ ] Banner aparece nas 3 telas para usuario gratuito
- [ ] Banner NAO aparece para usuario premium
- [ ] Banner NAO aparece em modo demo
- [ ] App nao quebra se anuncio falhar ao carregar
- [ ] Dialog de consentimento aparece na primeira abertura
- [ ] `npx tsc --noEmit` sem erros novos
- [ ] Build de desenvolvimento funciona (`eas build --profile development`)

---

## Pre-requisitos

- Conta no Google AdMob ja criada
- Apps Android e iOS registrados no AdMob (bundle: `com.laysadiniz.sweetpricing`)
- Ad units (banner) criadas para cada plataforma
- Mensagem de consentimento LGPD configurada no AdMob (Settings > Privacy & Messaging)
