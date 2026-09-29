import { useMutation } from '@tanstack/react-query';
import { Alert, Button, Form, Input } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { useErrorMessage } from '../../../hooks/useErrorMessage';
import { ApiError } from '../../../lib/api';
import { authApi } from '../auth-api';
import { useAuth } from '../auth-context';
import styles from '../AuthPage.module.scss';
import { applyFieldErrors, emailRules } from '../form-helpers';
import { safeRedirect } from '../redirect';

interface LoginValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { startSession } = useAuth();
  const [form] = Form.useForm<LoginValues>();
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  useDocumentTitle(t('auth.login.title'));

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: (session) => {
      startSession(session);
      navigate(safeRedirect(params.get('redirect')), { replace: true });
    },
    onError: (error, values) => {
      if (error instanceof ApiError && error.status === 403) {
        setUnverifiedEmail(values.email);
        return;
      }
      applyFieldErrors(form, error, ['email', 'password']);
    },
  });

  const resend = useMutation({ mutationFn: authApi.resendVerification });
  const genericError = useErrorMessage(login.error);

  const loginError =
    login.error instanceof ApiError && login.error.status === 401
      ? t('auth.login.invalidCredentials')
      : login.error instanceof ApiError && login.error.status === 403
        ? null
        : login.error && genericError;

  return (
    <>
      <h1 className={styles.title}>{t('auth.login.title')}</h1>

      {loginError && (
        <Alert
          className={styles.notice}
          type="error"
          title={loginError}
          data-testid="login-error"
        />
      )}
      {unverifiedEmail && (
        <Alert
          className={styles.notice}
          type="warning"
          data-testid="login-unverified"
          title={t('auth.login.notVerified')}
          description={
            resend.isSuccess ? (
              t('auth.login.resent')
            ) : (
              <Button
                type="link"
                size="small"
                className={styles.linkButton}
                loading={resend.isPending}
                onClick={() => resend.mutate(unverifiedEmail)}
              >
                {t('auth.login.resend')}
              </Button>
            )
          }
        />
      )}

      <Form<LoginValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        className={styles.form}
        disabled={login.isPending}
        onValuesChange={() => {
          if (unverifiedEmail) setUnverifiedEmail(null);
        }}
        onFinish={(values) => {
          setUnverifiedEmail(null);
          resend.reset();
          login.mutate({
            email: values.email.trim(),
            password: values.password,
          });
        }}
      >
        <Form.Item
          name="email"
          label={t('auth.fields.email')}
          rules={emailRules(t)}
        >
          <Input inputMode="email" autoComplete="email" autoFocus />
        </Form.Item>
        <Form.Item
          name="password"
          label={t('auth.fields.password')}
          rules={[
            { required: true, message: t('auth.validation.passwordRequired') },
          ]}
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <div className={styles.inlineLink}>
          <Link to="/auth/forgot-password">{t('auth.login.forgot')}</Link>
        </div>
        <Button
          type="primary"
          htmlType="submit"
          className={styles.submit}
          loading={login.isPending}
        >
          {t('auth.login.submit')}
        </Button>
      </Form>

      <p className={styles.alt}>
        {t('auth.login.noAccount')}{' '}
        <Link to="/auth/register">{t('auth.login.register')}</Link>
      </p>
    </>
  );
}
