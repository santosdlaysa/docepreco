import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import {
  GoogleSignin,
  isCancelledResponse,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import { authApi } from '../api/authApi';

export const googleSignInConfigured = Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);

if (googleSignInConfigured) {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
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
