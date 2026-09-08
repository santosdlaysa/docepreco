import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../database/connection';
import { hashSocialNonce, SocialProvider } from '../services/socialTokenVerifier';

interface FindOrCreateSocialUserInput {
  provider: SocialProvider;
  subject: string;
  email: string | null;
  displayName: string | null;
  platform: 'ios' | 'android' | 'web' | null;
}

export class PostgresSocialIdentityRepository {
  async createAppleNonce(): Promise<string> {
    const nonce = crypto.randomBytes(32).toString('base64url');
    const nonceHash = hashSocialNonce(nonce);
    await pool.query('DELETE FROM social_auth_nonces WHERE expires_at <= NOW()');
    await pool.query(
      `INSERT INTO social_auth_nonces (nonce_hash, expires_at)
       VALUES ($1, NOW() + INTERVAL '5 minutes')`,
      [nonceHash],
    );
    return nonce;
  }

  async consumeAppleNonce(nonce: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM social_auth_nonces
       WHERE nonce_hash = $1 AND expires_at > NOW()
       RETURNING nonce_hash`,
      [hashSocialNonce(nonce)],
    );
    return (result.rowCount ?? 0) === 1;
  }

  async findOrCreateUser(input: FindOrCreateSocialUserInput): Promise<{ userId: string; isNew: boolean }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const knownIdentity = await client.query(
        `SELECT user_id FROM auth_identities WHERE provider = $1 AND provider_subject = $2`,
        [input.provider, input.subject],
      );
      if (knownIdentity.rows[0]) {
        await client.query('COMMIT');
        return { userId: knownIdentity.rows[0].user_id, isNew: false };
      }

      if (!input.email) {
        await client.query('ROLLBACK');
        throw new Error('EMAIL_REQUIRED_FOR_SOCIAL_SIGNUP');
      }

      const email = input.email.toLowerCase();
      let userResult = await client.query('SELECT id FROM users WHERE email = $1 FOR UPDATE', [email]);
      let isNew = false;

      if (!userResult.rows[0]) {
        // Mantém o schema e o login por senha existentes. A senha aleatória nunca é
        // enviada ao cliente; o usuário pode definir uma depois por "Esqueci a senha".
        const internalPassword = crypto.randomBytes(48).toString('base64url');
        const passwordHash = await bcrypt.hash(internalPassword, 10);
        const companyName = input.displayName?.trim().slice(0, 255) || email.split('@')[0] || 'Minha confeitaria';
        userResult = await client.query(
          `INSERT INTO users (company_name, email, password_hash, signup_platform)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (email) DO NOTHING
           RETURNING id`,
          [companyName, email, passwordHash, input.platform],
        );
        if (userResult.rows[0]) {
          isNew = true;
        } else {
          userResult = await client.query('SELECT id FROM users WHERE email = $1 FOR UPDATE', [email]);
        }
      }

      const requestedUserId = userResult.rows[0].id as string;
      await client.query(
        `INSERT INTO auth_identities (user_id, provider, provider_subject, provider_email)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (provider, provider_subject) DO NOTHING`,
        [requestedUserId, input.provider, input.subject, email],
      );
      // Em uma corrida entre dois logins, a identidade que venceu é a fonte da verdade.
      const identity = await client.query(
        `SELECT user_id FROM auth_identities WHERE provider = $1 AND provider_subject = $2`,
        [input.provider, input.subject],
      );

      await client.query('COMMIT');
      return { userId: identity.rows[0].user_id, isNew };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }
}
