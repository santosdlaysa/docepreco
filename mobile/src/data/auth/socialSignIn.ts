import { authApi } from '../api/authApi';
import { getAppleAuthModule, getCryptoModule } from '../native/optionalNative';

export async function signInWithApple() {
  const AppleAuthentication = getAppleAuthModule();
  const Crypto = getCryptoModule();
  if (!AppleAuthentication || !Crypto) {
    throw new Error('Login Apple indisponível nesta versão do aplicativo');
  }
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
