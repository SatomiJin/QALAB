import { useMutation } from '@tanstack/react-query';
import { App, Button, Spin } from 'antd';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { useErrorMessage } from '../../../hooks/useErrorMessage';
import { ApiError } from '../../../lib/api';
import { authApi } from '../auth-api';
import { useAuth } from '../auth-context';
import styles from '../AuthPage.module.scss';
import { ResendVerificationForm } from '../ResendVerificationForm';

/** Landing page of the verification email link. */
export function VerifyEmailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [params] = useSearchParams();
  const { startSession } = useAuth();
  useDocumentTitle(t('auth.verify.title'));

  const tokenHash = params.get('token_hash');
  const type = params.get('type') === 'signup' ? 'signup' : 'email';

  const verify = useMutation({
    mutationFn: authApi.verifyEmail,
    onSuccess: (session) => {
      startSession(session);
      void message.success(t('auth.verify.success'));
      navigate('/dashboard', { replace: true });
    },
  });
  const errorMessage = useErrorMessage(verify.error);

  // The token hash works once: never send it twice (StrictMode runs
  // effects twice in development).
  const sent = useRef(false);
  const { mutate } = verify;
  useEffect(() => {
    if (!tokenHash || sent.current) return;
    sent.current = true;
    mutate({ tokenHash, type });
  }, [tokenHash, type, mutate]);

  if (!tokenHash) {
    return (
      <section data-testid="verify-missing">
        <h1 className={styles.title}>{t('auth.verify.title')}</h1>
        <p className={styles.description}>{t('auth.verify.missing')}</p>
        <ResendVerificationForm />
      </section>
    );
  }

  if (verify.isError) {
    const linkRejected =
      verify.error instanceof ApiError && verify.error.status === 400;
    return (
      <section data-testid="verify-failed">
        <h1 className={styles.title}>{t('auth.verify.failedTitle')}</h1>
        <p className={styles.description}>
          {linkRejected ? t('auth.verify.failed') : errorMessage}
        </p>
        {linkRejected ? (
          <ResendVerificationForm />
        ) : (
          <Button type="primary" onClick={() => mutate({ tokenHash, type })}>
            {t('feedback.tryAgain')}
          </Button>
        )}
        <p className={styles.alt}>
          <Link to="/auth/login">{t('auth.backToLogin')}</Link>
        </p>
      </section>
    );
  }

  return (
    <section data-testid="verify-pending" role="status" aria-live="polite">
      <h1 className={styles.title}>{t('auth.verify.title')}</h1>
      <p className={styles.description}>
        <Spin size="small" /> {t('auth.verify.verifying')}
      </p>
    </section>
  );
}
