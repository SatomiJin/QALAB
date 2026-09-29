import { Inject, Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { AppConfigService } from '../config/app-config.service.js';
import type { AuthUser } from './auth-user.js';

/** Key set used to verify access tokens. Tests replace it with a local one. */
export const JWT_KEY_SET = Symbol('JWT_KEY_SET');

export function authBaseUrl(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/+$/, '')}/auth/v1`;
}

export const jwtKeySetProvider = {
  provide: JWT_KEY_SET,
  inject: [AppConfigService],
  // Supabase signs with asymmetric keys (ES256) and publishes them as JWKS.
  // jose caches the keys and refetches on an unknown `kid` (key rotation).
  useFactory: (config: AppConfigService): JWTVerifyGetKey =>
    createRemoteJWKSet(
      new URL(`${authBaseUrl(config.supabaseUrl)}/.well-known/jwks.json`),
    ),
};

export class InvalidTokenError extends Error {}

/**
 * Verifies Supabase access tokens locally: signature, expiry, issuer and
 * audience. No network call per request.
 */
@Injectable()
export class JwtVerifierService {
  private readonly issuer: string;

  constructor(
    @Inject(JWT_KEY_SET) private readonly keySet: JWTVerifyGetKey,
    config: AppConfigService,
  ) {
    this.issuer = authBaseUrl(config.supabaseUrl);
  }

  async verify(token: string): Promise<AuthUser> {
    try {
      const { payload } = await jwtVerify(token, this.keySet, {
        issuer: this.issuer,
        audience: 'authenticated',
        algorithms: ['ES256', 'RS256'],
      });

      if (
        typeof payload.sub !== 'string' ||
        payload.role !== 'authenticated' ||
        typeof payload.email !== 'string'
      ) {
        throw new InvalidTokenError('Unexpected token claims');
      }

      return {
        id: payload.sub,
        email: payload.email,
        sessionId:
          typeof payload.session_id === 'string' ? payload.session_id : null,
        accessToken: token,
      };
    } catch (error) {
      if (error instanceof InvalidTokenError) throw error;
      // Do not include the token or jose's details in the message.
      throw new InvalidTokenError('Invalid access token');
    }
  }
}
