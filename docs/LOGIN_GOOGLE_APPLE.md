# Login com Google e Apple

O aplicativo já possui o fluxo de login e o backend valida os tokens recebidos. Para publicar, configure as credenciais abaixo. **Nunca envie senhas, chaves privadas ou arquivos `.env` pelo chat nem os registre no Git.**

## Identificadores já usados pelo aplicativo

| Plataforma | Identificador |
| --- | --- |
| Android | `com.orgenyx` |
| iOS | `com.laysadiniz.sweetpricing` |
| API de produção | `https://docepreco.onrender.com/api` |

## Google

Abra [Google Cloud Console > APIs e serviços > Credenciais](https://console.cloud.google.com/apis/credentials). No mesmo projeto, configure a tela de consentimento OAuth e publique-a ou adicione as contas de teste.

Crie estes três clientes OAuth 2.0:

1. **Aplicativo da Web**: guarde o `Client ID`. É o ID de servidor usado pelo aplicativo para obter um ID token.
2. **Android**: informe o pacote `com.orgenyx` e os SHA-1 do certificado de teste/EAS e do certificado de assinatura da Play Store. No Play Console, eles ficam em **Configuração > Integridade do app**.
3. **iOS**: informe o Bundle ID `com.laysadiniz.sweetpricing`. Na página desse cliente, copie o campo **iOS URL scheme**; ele começa com `com.googleusercontent.apps.`.

Preencha os valores:

```dotenv
# mobile/.env, apenas para desenvolvimento local
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<CLIENT_ID_DO_CLIENTE_WEB>
EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME=<IOS_URL_SCHEME_DO_CLIENTE_IOS>

# backend/.env, para desenvolvimento local
GOOGLE_CLIENT_IDS=<CLIENT_ID_DO_CLIENTE_WEB>
```

No Render, em **Environment**, crie ou atualize `GOOGLE_CLIENT_IDS` com o mesmo Client ID do cliente Web e faça um novo deploy. O ID do cliente é público; não use nem guarde um `client secret` no app.

No EAS, em **Project settings > Environment variables**, crie estas variáveis como `Plain text` nos ambientes que serão compilados (`development`, `preview` e `production`):

```text
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<CLIENT_ID_DO_CLIENTE_WEB>
EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME=<IOS_URL_SCHEME_DO_CLIENTE_IOS>
```

Também é possível cadastrar via CLI:

```bash
eas env:set --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "<CLIENT_ID_DO_CLIENTE_WEB>" --environment production --visibility plaintext
eas env:set --name EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME --value "<IOS_URL_SCHEME_DO_CLIENTE_IOS>" --environment production --visibility plaintext
```

Repita para `preview` antes de testar uma build interna. O login Google usa módulo nativo: ele não funciona no Expo Go; gere uma development build ou uma build EAS.

## Apple

No [Apple Developer > Certificates, Identifiers & Profiles > Identifiers](https://developer.apple.com/account/resources/identifiers/list), abra (ou crie) o App ID `com.laysadiniz.sweetpricing` e habilite a capacidade **Sign in with Apple**. Se for a primeira configuração, selecione-o como App ID primário.

Depois, no Render, em **Environment**, crie ou atualize:

```dotenv
APPLE_CLIENT_IDS=com.laysadiniz.sweetpricing
```

Faça um novo deploy do backend. O fluxo iOS atual verifica o ID token diretamente com as chaves públicas da Apple e, por isso, **não precisa de chave privada Apple nem de client secret**.

Após habilitar a capacidade na Apple, gere uma nova build iOS EAS para atualizar o perfil de assinatura. O botão Apple só aparece em dispositivos iOS compatíveis; ele não é exibido no Android.

## Ordem de teste

1. Preencha o `.env` local e as variáveis do Render/EAS.
2. Faça o deploy do backend para executar as migrações de `auth_identities` e `social_auth_nonces`.
3. Gere uma build EAS de preview para Android e iOS; não use Expo Go.
4. Teste com uma conta Google e uma Apple que nunca tenham entrado no DocePreço.
5. Saia, entre novamente e confirme que a mesma conta é recuperada.

Referências oficiais: [Expo — Google Authentication](https://docs.expo.dev/guides/google-authentication/), [Google — clientes OAuth Android/Web](https://codelabs.developers.google.com/sign-in-with-google-android), [Apple — habilitar Sign in with Apple](https://developer.apple.com/help/account/identifiers/enable-app-capabilities/) e [EAS — variáveis de ambiente](https://docs.expo.dev/eas/environment-variables/manage/).
