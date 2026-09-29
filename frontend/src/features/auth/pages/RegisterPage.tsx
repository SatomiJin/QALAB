import { useMutation } from '@tanstack/react-query';
import { Alert, Button, Form, Input } from 'antd';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { useErrorMessage } from '../../../hooks/useErrorMessage';
import {
  DISPLAY_NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../../types/api';
import { authApi } from '../auth-api';
import styles from '../AuthPage.module.scss';
import {
  applyFieldErrors,
  emailRules,
  hasFieldErrors,
  newPasswordRules,
} from '../form-helpers';

const REGISTER_FIELDS = ['email', 'password', 'displayName'] as const;

interface RegisterValues {
  displayName: string;
  email: string;
  password: string;
}

export function RegisterPage() {
  const { t } = useTranslation();
  const [form] = Form.useForm<RegisterValues>();
  useDocumentTitle(t('auth.register.title'));

  const register = useMutation({
    mutationFn: authApi.register,
    onError: (error) => applyFieldErrors(form, error, REGISTER_FIELDS),
  });
  const resend = useMutation({ mutationFn: authApi.resendVerification });
  const errorMessage = useErrorMessage(register.error);

  if (register.isSuccess) {
    const email = register.variables.email;
    return (
      <section data-testid="register-sent">
        <h1 className={styles.title}>{t('auth.register.sentTitle')}</h1>
        <p className={styles.description}>
          <Trans
            i18nKey="auth.register.sentBody"
            values={{ email }}
            components={{ strong: <span className={styles.email} /> }}
          />
        </p>
        {resend.isSuccess ? (
          <Alert
            className={styles.notice}
            type="success"
            title={t('auth.register.resent')}
          />
        ) : (
          <Button
            loading={resend.isPending}
            onClick={() => resend.mutate(email)}
          >
            {t('auth.register.resend')}
          </Button>
        )}
        <p className={styles.alt}>
          <Link to="/auth/login">{t('auth.backToLogin')}</Link>
        </p>
      </section>
    );
  }

  const showBanner =
    register.isError && !hasFieldErrors(register.error, REGISTER_FIELDS);

  return (
    <>
      <h1 className={styles.title}>{t('auth.register.title')}</h1>
      <p className={styles.description}>{t('auth.register.description')}</p>

      {showBanner && (
        <Alert className={styles.notice} type="error" title={errorMessage} />
      )}

      <Form<RegisterValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        disabled={register.isPending}
        onFinish={(values) =>
          register.mutate({
            displayName: values.displayName.trim(),
            email: values.email.trim(),
            password: values.password,
          })
        }
      >
        <Form.Item
          name="displayName"
          label={t('auth.fields.displayName')}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('auth.validation.displayNameRequired'),
            },
            {
              max: DISPLAY_NAME_MAX_LENGTH,
              message: t('auth.validation.displayNameMax', {
                max: DISPLAY_NAME_MAX_LENGTH,
              }),
            },
          ]}
        >
          <Input autoComplete="nickname" autoFocus />
        </Form.Item>
        <Form.Item
          name="email"
          label={t('auth.fields.email')}
          rules={emailRules(t)}
        >
          <Input inputMode="email" autoComplete="email" />
        </Form.Item>
        <Form.Item
          name="password"
          label={t('auth.fields.password')}
          rules={newPasswordRules(t)}
          extra={t('auth.passwordHint', { min: PASSWORD_MIN_LENGTH })}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          className={styles.submit}
          loading={register.isPending}
        >
          {t('auth.register.submit')}
        </Button>
      </Form>

      <p className={styles.alt}>
        {t('auth.register.haveAccount')}{' '}
        <Link to="/auth/login">{t('auth.register.signIn')}</Link>
      </p>
    </>
  );
}
