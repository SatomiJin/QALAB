import { useMutation } from '@tanstack/react-query';
import { Alert, Button, Form, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { useErrorMessage } from '../../../hooks/useErrorMessage';
import { ApiError } from '../../../lib/api';
import { PASSWORD_MIN_LENGTH } from '../../../types/api';
import { authApi } from '../auth-api';
import styles from '../AuthPage.module.scss';
import {
  applyFieldErrors,
  confirmPasswordRules,
  hasFieldErrors,
  newPasswordRules,
} from '../form-helpers';

const FIELDS = ['newPassword'] as const;

interface ResetValues {
  newPassword: string;
  confirmPassword: string;
}

/** Landing page of the password reset email link. */
export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form] = Form.useForm<ResetValues>();
  useDocumentTitle(t('auth.reset.title'));
  const tokenHash = params.get('token_hash');

  const reset = useMutation({
    mutationFn: authApi.resetPassword,
    onError: (error) => applyFieldErrors(form, error, FIELDS),
  });
  const errorMessage = useErrorMessage(reset.error);

  if (!tokenHash) {
    return (
      <section data-testid="reset-missing">
        <h1 className={styles.title}>{t('auth.reset.title')}</h1>
        <p className={styles.description}>{t('auth.reset.missing')}</p>
        <Button
          type="primary"
          onClick={() => navigate('/auth/forgot-password')}
        >
          {t('auth.reset.requestNew')}
        </Button>
      </section>
    );
  }

  if (reset.isSuccess) {
    return (
      <section data-testid="reset-done">
        <h1 className={styles.title}>{t('auth.reset.successTitle')}</h1>
        <p className={styles.description}>{t('auth.reset.successBody')}</p>
        <Button
          type="primary"
          onClick={() => navigate('/auth/login', { replace: true })}
        >
          {t('auth.reset.signIn')}
        </Button>
      </section>
    );
  }

  const fieldError = hasFieldErrors(reset.error, FIELDS);
  const linkRejected =
    reset.error instanceof ApiError &&
    reset.error.status === 400 &&
    !fieldError;

  if (linkRejected) {
    return (
      <section data-testid="reset-invalid">
        <h1 className={styles.title}>{t('auth.reset.invalidTitle')}</h1>
        <p className={styles.description}>{t('auth.reset.invalid')}</p>
        <Button
          type="primary"
          onClick={() => navigate('/auth/forgot-password')}
        >
          {t('auth.reset.requestNew')}
        </Button>
      </section>
    );
  }

  return (
    <>
      <h1 className={styles.title}>{t('auth.reset.title')}</h1>
      {reset.isError && !fieldError && (
        <Alert className={styles.notice} type="error" title={errorMessage} />
      )}
      <Form<ResetValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        className={styles.form}
        disabled={reset.isPending}
        onFinish={({ newPassword }) => reset.mutate({ tokenHash, newPassword })}
      >
        <Form.Item
          name="newPassword"
          label={t('auth.fields.newPassword')}
          rules={newPasswordRules(t)}
          extra={t('auth.passwordHint', { min: PASSWORD_MIN_LENGTH })}
        >
          <Input.Password autoComplete="new-password" autoFocus />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label={t('auth.fields.confirmPassword')}
          dependencies={['newPassword']}
          rules={confirmPasswordRules(t, 'newPassword')}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          className={styles.submit}
          loading={reset.isPending}
        >
          {t('auth.reset.submit')}
        </Button>
      </Form>
      <p className={styles.alt}>
        <Link to="/auth/login">{t('auth.backToLogin')}</Link>
      </p>
    </>
  );
}
