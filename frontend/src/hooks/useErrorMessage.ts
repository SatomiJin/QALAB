import { useTranslation } from 'react-i18next';
import { ApiError } from '../lib/api';

/**
 * User-facing message for an error. Network and unknown errors are
 * translated here; other API errors show the backend message.
 */
export function useErrorMessage(error: unknown): string {
  const { t } = useTranslation();

  if (error instanceof ApiError) {
    return error.isNetworkError ? t('feedback.networkError') : error.message;
  }
  return t('feedback.genericError');
}
