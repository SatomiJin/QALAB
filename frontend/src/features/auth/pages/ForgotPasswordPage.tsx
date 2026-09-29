import { useMutation } from '@tanstack/react-query';
import { Alert, Button, Form, Input } from 'antd';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { useErrorMessage } from '../../../hooks/useErrorMessage';
import { authApi } from '../auth-api';
import styles from '../AuthPage.module.scss';
import { emailRules } from '../form-helpers';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('auth.forgot.title'));
  const forgot = useMutation({ mutationFn: authApi.forgotPassword });
  const errorMessage = useErrorMessage(forgot.error);

  if (forgot.isSuccess) {
    return (
      <section data-testid="forgot-sent">
        <h1 className={styles.title}>{t('auth.forgot.sentTitle')}</h1>
        <p className={styles.description}>
          <Trans
            i18nKey="auth.forgot.sentBody"
            values={{ email: forgot.variables }}
            components={{ strong: <span className={styles.email} /> }}
          />
        </p>
        <p className={styles.alt}>
          <Link to="/auth/login">{t('auth.backToLogin')}</Link>
        </p>
      </section>
    );
  }

  return (
    <>
      <h1 className={styles.title}>{t('auth.forgot.title')}</h1>
      <p className={styles.description}>{t('auth.forgot.description')}</p>
      {forgot.isError && (
        <Alert className={styles.notice} type="error" title={errorMessage} />
      )}
      <Form<{ email: string }>
        layout="vertical"
        requiredMark={false}
        disabled={forgot.isPending}
        onFinish={({ email }) => forgot.mutate(email.trim())}
      >
        <Form.Item
          name="email"
          label={t('auth.fields.email')}
          rules={emailRules(t)}
        >
          <Input inputMode="email" autoComplete="email" autoFocus />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          className={styles.submit}
          loading={forgot.isPending}
        >
          {t('auth.forgot.submit')}
        </Button>
      </Form>
      <p className={styles.alt}>
        <Link to="/auth/login">{t('auth.backToLogin')}</Link>
      </p>
    </>
  );
}
