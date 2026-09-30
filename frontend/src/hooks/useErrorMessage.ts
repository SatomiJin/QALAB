import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../lib/api';

/**
 * User-facing message for an error. Network, rate-limit and unknown errors
 * are translated here; other API errors show the backend message.
 */
export function errorMessage(error: unknown, t: TFunction): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return t('feedback.networkError');
    if (error.status === 429) return t('feedback.tooManyRequests');
    if (error.status >= 500) return t('feedback.genericError');
    return error.message;
  }
  return t('feedback.genericError');
}

export function useErrorMessage(error: unknown): string {
  const { t } = useTranslation();
  return errorMessage(error, t);
}
