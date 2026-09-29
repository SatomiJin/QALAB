import { createApiClient } from './api';
import { env } from './config';

/** Shared API client. All backend calls go through this instance. */
export const api = createApiClient({ baseUrl: env.apiBaseUrl });
