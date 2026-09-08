import crypto from 'crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { OAuth2Client } from 'google-auth-library';

export type SocialProvider = 'google' | 'apple';

export interface VerifiedSocialIdentity {
  provider: SocialProvider;
  subject: string;
  email: string | null;
  displayName: string | null;
}

export class SocialAuthError extends Error {
  constructor(message: string, public readonly kind: 'invalid_token' | 'configuration') {
    super(message);
    this.name = 'SocialAuthError';
  }
}

const googleClient = new OAuth2Client();
const appleKeys = jwksClient({
  jwksUri: 'https://appleid.apple.com/auth/keys',
  cache: true,
  cacheMaxAge: 60 * 60 * 1000,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

function csvEnv(name: string): string[] {
  return (process.env[name] || '').split(',').map(value => value.trim()).filter(Boolean);
}

function sameValue(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function hashSocialNonce(nonce: string): string {
  return crypto.createHash('sha256').update(nonce).digest('hex');
}

async function verifyGoogle(idToken: string): Promise<VerifiedSocialIdentity> {
  const audience = csvEnv('GOOGLE_CLIENT_IDS');
  if (audience.length === 0) {
    throw new SocialAuthError('Login Google ainda não foi configurado no servidor', 'configuration');
  }

  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      throw new Error('claims obrigatórios ausentes');
    }
    return {
      provider: 'google',
      subject: payload.sub,
      email: payload.email.toLowerCase(),
      displayName: payload.name?.trim() || null,
    };
  } catch (error) {
    if (error instanceof SocialAuthError) throw error;
    throw new SocialAuthError('Token Google inválido ou expirado', 'invalid_token');
  }
}

async function verifyApple(idToken: string, nonce: string | undefined): Promise<VerifiedSocialIdentity> {
  const audience = csvEnv('APPLE_CLIENT_IDS');
  if (audience.length === 0) {
    throw new SocialAuthError('Login Apple ainda não foi configurado no servidor', 'configuration');
  }
  if (!nonce) {
    throw new SocialAuthError('Nonce do login Apple não informado', 'invalid_token');
  }

  try {
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
      throw new Error('cabeçalho JWT inválido');
    }
    const signingKey = await appleKeys.getSigningKey(decoded.header.kid);
    const payload = jwt.verify(idToken, signingKey.getPublicKey(), {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
      audience: audience.length === 1 ? audience[0] : audience as [string, ...string[]],
    }) as JwtPayload;

    if (!payload.sub || typeof payload.nonce !== 'string' || !sameValue(payload.nonce, hashSocialNonce(nonce))) {
      throw new Error('claims obrigatórios ausentes');
    }
    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : null;
    const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
    if (email && !emailVerified) throw new Error('email não verificado');

    return { provider: 'apple', subject: payload.sub, email, displayName: null };
  } catch (error) {
    if (error instanceof SocialAuthError) throw error;
    throw new SocialAuthError('Token Apple inválido ou expirado', 'invalid_token');
  }
}

export function verifySocialToken(
  provider: SocialProvider,
  idToken: string,
  nonce?: string,
): Promise<VerifiedSocialIdentity> {
  return provider === 'google' ? verifyGoogle(idToken) : verifyApple(idToken, nonce);
}
