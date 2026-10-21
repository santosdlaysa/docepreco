import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import {
  GoogleSignin,
  isCancelledResponse,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import { authApi } from '../api/authApi';

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;
// O plugin nativo usa o URL scheme, mas o SDK também precisa receber o Client
// ID iOS em tempo de execução. Derivamos o ID do scheme já configurado para
// evitar manter a mesma credencial em duas variáveis diferentes.
const googleIosClientId = googleIosUrlScheme
  ?.replace(/^com\.googleusercontent\.apps\./, '')
  .replace(/^(.+)$/, '$1.apps.googleusercontent.com');

export const googleSignInConfigured = Boolean(
  googleWebClientId && (Platform.OS !== 'ios' || googleIosClientId),
);

if (googleSignInConfigured) {
  GoogleSignin.configure({
    webClientId: googleWebClientId,
    ...(googleIosClientId ? { iosClientId: googleIosClientId } : {}),
  });
}

export async function signInWithGoogle() {
  if (!googleSignInConfigured) {
    throw new Error('Login Google ainda não foi configurado neste aplicativo');
  }
  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }
  const response = await GoogleSignin.signIn({});
  if (isCancelledResponse(response)) return null;
  if (!isSuccessResponse(response) || !response.data.idToken) {
    throw new Error('A Google não retornou um token de identidade');
  }
  return authApi.socialLogin('google', response.data.idToken);
}

export async function signInWithApple() {
  const nonce = await authApi.getSocialNonce();
  const nonceHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
  const credential = await AppleAuthentication.signInAsync({
    nonce: nonceHash,
    state: nonceHash,
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) {
    throw new Error('A Apple não retornou um token de identidade');
  }
  if (credential.state !== nonceHash) {
    throw new Error('Resposta de login Apple inválida');
  }
  const displayName = credential.fullName
    ? AppleAuthentication.formatFullName(credential.fullName).trim() || null
    : null;
  return authApi.socialLogin('apple', credential.identityToken, { nonce, displayName });
}
