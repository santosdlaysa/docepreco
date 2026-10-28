// Módulos nativos adicionados depois de binários que ainda estão instalados
// (iOS 2.12.0 / Android antigos). Como o runtimeVersion é fixo, esses binários
// recebem os updates OTA; um import estático de módulo nativo ausente lança
// erro ao carregar o bundle e o app fecha na abertura. Carregamos sob demanda
// e devolvemos null quando o binário não tem o módulo.

function tryRequire<T>(load: () => T): T | null {
  try {
    return load();
  } catch {
    return null;
  }
}

let googleSignin: typeof import('@react-native-google-signin/google-signin') | null | undefined;
let appleAuth: typeof import('expo-apple-authentication') | null | undefined;
let crypto: typeof import('expo-crypto') | null | undefined;

export function getGoogleSigninModule() {
  if (googleSignin === undefined) {
    googleSignin = tryRequire(() => require('@react-native-google-signin/google-signin'));
  }
  return googleSignin;
}

export function getAppleAuthModule() {
  if (appleAuth === undefined) {
    appleAuth = tryRequire(() => require('expo-apple-authentication'));
  }
  return appleAuth;
}

export function getCryptoModule() {
  if (crypto === undefined) {
    crypto = tryRequire(() => require('expo-crypto'));
  }
  return crypto;
}
