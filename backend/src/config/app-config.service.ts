import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables, NodeEnv } from './env.validation.js';

/** Typed accessor over validated environment variables. */
@Injectable()
export class AppConfigService {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  get nodeEnv(): NodeEnv {
    return this.config.get('NODE_ENV', { infer: true });
  }

  get isProduction(): boolean {
    return this.nodeEnv === NodeEnv.Production;
  }

  get port(): number {
    return this.config.get('PORT', { infer: true });
  }

  get corsOrigins(): string[] {
    return this.config
      .get('CORS_ORIGIN', { infer: true })
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  /** Extra allowed origins (preview deployments); null when not set. */
  get corsOriginPattern(): RegExp | null {
    const pattern = this.config.get('CORS_ORIGIN_PATTERN', { infer: true });
    return pattern ? new RegExp(pattern) : null;
  }

  get frontendUrl(): string {
    return this.config.get('FRONTEND_URL', { infer: true });
  }

  get swaggerEnabled(): boolean {
    return this.config.get('SWAGGER_ENABLED', { infer: true });
  }

  get authRateLimit(): number {
    return this.config.get('AUTH_RATE_LIMIT', { infer: true });
  }

  get authMinResponseMs(): number {
    return this.config.get('AUTH_MIN_RESPONSE_MS', { infer: true });
  }

  get attemptRateLimit(): number {
    return this.config.get('ATTEMPT_RATE_LIMIT', { infer: true });
  }

  get trustProxyHops(): number {
    return this.config.get('TRUST_PROXY_HOPS', { infer: true });
  }

  get supabaseUrl(): string {
    return this.config.get('SUPABASE_URL', { infer: true });
  }

  get supabaseAnonKey(): string {
    return this.config.get('SUPABASE_ANON_KEY', { infer: true });
  }

  get supabaseServiceRoleKey(): string {
    return this.config.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true });
  }

  /** Empty string when not configured. */
  get googleTranslateApiKey(): string {
    return this.config.get('GOOGLE_TRANSLATE_API_KEY', { infer: true }) ?? '';
  }
}
