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
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

const URL_OPTIONS = { require_tld: false, require_protocol: true };

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
