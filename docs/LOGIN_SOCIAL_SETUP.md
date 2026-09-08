# Configuração do login Google e Apple

O código mantém o cadastro/login por email e senha. Google e Apple são opções
adicionais e, depois da validação, recebem o mesmo JWT usado pelo restante do app.

## Google Cloud

1. Configure a tela de consentimento OAuth no Google Cloud.
2. Crie clientes OAuth para Android, iOS e Aplicativo da Web.
3. No cliente Android use o package `com.orgenyx` e cadastre os SHA-1 da chave de
   upload e da chave do Google Play App Signing.
4. No cliente iOS use o bundle `com.laysadiniz.sweetpricing`.
5. Configure no ambiente do mobile/EAS:

   ```env
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=000000.apps.googleusercontent.com
   EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME=com.googleusercontent.apps.000000
   ```

6. Configure no backend todos os IDs cujo token será aceito:

   ```env
   GOOGLE_CLIENT_IDS=web-id.apps.googleusercontent.com,ios-id.apps.googleusercontent.com
   ```

O botão Google só aparece quando `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` estiver definido.

## Apple Developer

1. Ative **Sign in with Apple** para o App ID `com.laysadiniz.sweetpricing`.
2. Confirme no backend:

   ```env
   APPLE_CLIENT_IDS=com.laysadiniz.sweetpricing
   ```

3. Gere um novo build iOS. `ios.usesAppleSignIn` e o plugin do Expo já estão no
   `app.json`.

## Publicação

1. Execute a migration do backend com `npm run migrate`.
2. Publique o backend com as variáveis acima.
3. Gere um novo binário nativo; esta mudança não pode ser entregue somente por OTA.
4. Teste Google em uma instalação obtida da Play Store e Apple em um iPhone real.

Contas existentes são vinculadas pelo email validado do provedor e continuam com
a senha atual. Contas sociais novas recebem uma senha interna aleatória e podem
definir uma senha posteriormente pelo fluxo **Esqueci a senha**.
