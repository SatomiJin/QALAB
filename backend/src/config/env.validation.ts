import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  Validate,
  validateSync,
  type ValidationArguments,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

const URL_OPTIONS = { require_tld: false, require_protocol: true };

/**
 * An origin pattern must match whole HTTPS origins only: anchored with `^`
 * and `$` and starting with `https://`, so `.*` cannot open the API to every
 * site, and it must compile.
 */
@ValidatorConstraint({ name: 'anchoredHttpsPattern' })
class AnchoredHttpsPattern implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    if (!value.startsWith('^https://') || !value.endsWith('$')) return false;
    try {
      new RegExp(value);
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage({ property }: ValidationArguments): string {
    return `${property} must be a valid regular expression of the form ^https://…$`;
  }
}

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Transform(({ value }) => (value === undefined ? value : Number(value)))
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  /** Comma-separated list of allowed browser origins. */
  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN = 'http://localhost:5173';

  /**
   * Optional regular expression for more allowed origins, e.g. the Vercel
   * preview deployments of the frontend:
   * `^https://qalab-web-[a-z0-9-]+-<scope>\.vercel\.app$`.
   */
  // An empty value (as in .env.example) means "not set".
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString()
  @Validate(AnchoredHttpsPattern)
  CORS_ORIGIN_PATTERN?: string;

  @IsUrl(URL_OPTIONS)
  FRONTEND_URL = 'http://localhost:5173';

  @Transform(({ value }) =>
    value === undefined ? value : String(value).toLowerCase() === 'true',
  )
  @IsBoolean()
  SWAGGER_ENABLED = true;

  /** Requests per minute per IP for each `/auth/*` endpoint. */
  @Transform(({ value }) => (value === undefined ? value : Number(value)))
  @IsInt()
  @Min(1)
  AUTH_RATE_LIMIT = 5;

  /** Attempt submissions per minute per user. */
  @Transform(({ value }) => (value === undefined ? value : Number(value)))
  @IsInt()
  @Min(1)
  ATTEMPT_RATE_LIMIT = 20;

  /**
   * Number of reverse proxies in front of the API (Render, Railway, …).
   * Needed so rate limiting sees the client IP instead of the proxy's.
   */
  @Transform(({ value }) => (value === undefined ? value : Number(value)))
  @IsInt()
  @Min(0)
  TRUST_PROXY_HOPS = 0;

  @IsUrl(URL_OPTIONS)
  SUPABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  SUPABASE_ANON_KEY: string;

  @IsString()
  @IsNotEmpty()
  SUPABASE_SERVICE_ROLE_KEY: string;

  /**
   * Google Cloud Translation API key (v2). Optional: without it, Vietnamese
   * requests get the English content with `translation: "unavailable"`.
   */
  @IsOptional()
  @IsString()
  GOOGLE_TRANSLATE_API_KEY?: string;
}

/**
 * Validates process env at startup. The app refuses to boot with an invalid
 * configuration instead of failing later at request time.
 */
export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config, {
    exposeDefaultValues: true,
  });
  const errors = validateSync(env, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map(
        (e) =>
          `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`,
      )
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return env;
}
