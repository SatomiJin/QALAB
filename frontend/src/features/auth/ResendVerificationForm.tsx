import { useMutation } from '@tanstack/react-query';
import { Alert, Button, Form, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../../hooks/useErrorMessage';
import { authApi } from './auth-api';
import styles from './AuthPage.module.scss';
import { emailRules } from './form-helpers';

/** Asks for a new verification link. The answer never reveals accounts. */
export function ResendVerificationForm() {
  const { t } = useTranslation();
  const resend = useMutation({ mutationFn: authApi.resendVerification });
  const errorMessage = useErrorMessage(resend.error);

  if (resend.isSuccess) {
    return (
      <Alert
        type="success"
        title={t('auth.verify.sent')}
        data-testid="resend-sent"
      />
    );
  }

  return (
    <>
      {resend.isError && (
        <Alert className={styles.notice} type="error" title={errorMessage} />
      )}
      <Form<{ email: string }>
        layout="vertical"
        requiredMark={false}
        disabled={resend.isPending}
        onFinish={({ email }) => resend.mutate(email.trim())}
      >
        <Form.Item
          name="email"
          label={t('auth.fields.email')}
          rules={emailRules(t)}
        >
          <Input inputMode="email" autoComplete="email" />
        </Form.Item>
        <Button
          htmlType="submit"
          className={styles.submit}
          loading={resend.isPending}
        >
          {t('auth.verify.submit')}
        </Button>
      </Form>
    </>
  );
}
