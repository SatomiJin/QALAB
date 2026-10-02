import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Form, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '../../components/feedback/ErrorState';
import { PageLoader } from '../../components/feedback/PageLoader';
import { PageHeader } from '../../components/PageHeader';
import { useErrorMessage } from '../../hooks/useErrorMessage';
import { ApiError } from '../../lib/api';
import {
  DISPLAY_NAME_MAX_LENGTH,
  EXPERIENCE_LEVELS,
  MAX_LEARNING_GOAL_LENGTH,
  MAX_LEARNING_GOALS,
  PASSWORD_MIN_LENGTH,
  type ExperienceLevel,
  type Profile,
} from '../../types/api';
import { authApi } from '../auth/auth-api';
import { ME_QUERY_KEY, useAuth } from '../auth/auth-context';
import {
  applyFieldErrors,
  confirmPasswordRules,
  hasFieldErrors,
  newPasswordRules,
} from '../auth/form-helpers';
import styles from './ProfilePage.module.scss';

const PROFILE_FIELDS = [
  'displayName',
  'experienceLevel',
  'learningGoals',
] as const;

interface ProfileValues {
  displayName: string;
  experienceLevel: ExperienceLevel | undefined;
  learningGoals: string[];
}

interface PasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ProfilePage() {
  const { t } = useTranslation();
  const { profile, profileQuery } = useAuth();

  if (profileQuery.isPending) return <PageLoader />;
  if (profileQuery.isError || !profile) {
    return (
      <>
        <PageHeader title={t('profile.title')} />
        <ErrorState error={profileQuery.error} onRetry={profileQuery.refetch} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t('profile.title')}
        description={t('profile.description')}
      />
      <AccountSection profile={profile} />
      <AboutSection profile={profile} />
      <PasswordSection />
    </>
  );
}

function AccountSection({ profile }: { profile: Profile }) {
  const { t, i18n } = useTranslation();
  const memberSince = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'long',
  }).format(new Date(profile.createdAt));

  return (
    <section className={styles.section} aria-labelledby="profile-account">
      <h2 id="profile-account" className={styles.sectionTitle}>
        {t('profile.account')}
      </h2>
      <div className={styles.sectionBody}>
        <dl className={styles.facts}>
          <dt>{t('profile.email')}</dt>
          <dd data-testid="profile-email">{profile.email}</dd>
          <dt>{t('profile.role')}</dt>
          <dd data-testid="profile-role" data-state={profile.role}>
            {t(`profile.roles.${profile.role}`)}
          </dd>
          <dt>{t('profile.memberSince')}</dt>
          <dd>{memberSince}</dd>
        </dl>
      </div>
    </section>
  );
}

function AboutSection({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ProfileValues>();

  const save = useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: (updated) => {
      queryClient.setQueryData(ME_QUERY_KEY, updated);
      form.resetFields();
      void message.success(t('profile.saved'));
    },
    onError: (error) => applyFieldErrors(form, error, PROFILE_FIELDS),
  });
  const errorMessage = useErrorMessage(save.error);

  return (
    <section className={styles.section} aria-labelledby="profile-about">
      <h2 id="profile-about" className={styles.sectionTitle}>
        {t('profile.about')}
      </h2>
      <div className={styles.sectionBody}>
        {save.isError && !hasFieldErrors(save.error, PROFILE_FIELDS) && (
          <Alert className={styles.notice} type="error" title={errorMessage} />
        )}
        <Form<ProfileValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          disabled={save.isPending}
          initialValues={{
            displayName: profile.displayName,
            experienceLevel: profile.experienceLevel ?? undefined,
            learningGoals: profile.learningGoals,
          }}
          onFinish={(values) =>
            save.mutate({
              displayName: values.displayName.trim(),
              experienceLevel: values.experienceLevel ?? null,
              learningGoals: values.learningGoals
                .map((goal) => goal.trim())
                .filter(Boolean),
            })
          }
        >
          <Form.Item
            name="displayName"
            label={t('profile.displayName')}
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
            <Input autoComplete="nickname" />
          </Form.Item>
          <Form.Item
            name="experienceLevel"
            label={t('profile.experienceLevel')}
          >
            <Select
              allowClear
              placeholder={t('profile.experienceLevelPlaceholder')}
              options={EXPERIENCE_LEVELS.map((level) => ({
                value: level,
                label: t(`profile.levels.${level}`),
              }))}
            />
          </Form.Item>
          <Form.Item
            name="learningGoals"
            label={t('profile.learningGoals')}
            extra={t('profile.learningGoalsHint', {
              max: MAX_LEARNING_GOALS,
              length: MAX_LEARNING_GOAL_LENGTH,
            })}
            rules={[
              {
                type: 'array',
                max: MAX_LEARNING_GOALS,
                message: t('profile.learningGoalsMax', {
                  max: MAX_LEARNING_GOALS,
                }),
              },
              {
                validator: (_, goals: string[] = []) =>
                  goals.every((goal) => goal.length <= MAX_LEARNING_GOAL_LENGTH)
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error(
                          t('profile.learningGoalLength', {
                            length: MAX_LEARNING_GOAL_LENGTH,
                          }),
                        ),
                      ),
              },
            ]}
          >
            <Select mode="tags" open={false} suffixIcon={null} />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={save.isPending}
            className={styles.primaryAction}
          >
            {t('profile.save')}
          </Button>
        </Form>
      </div>
    </section>
  );
}

function PasswordSection() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [form] = Form.useForm<PasswordValues>();

  const change = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      form.resetFields();
      void message.success(t('profile.password.changed'));
    },
    onError: (error) => {
      if (hasFieldErrors(error, ['currentPassword'])) {
        form.setFields([
          {
            name: 'currentPassword',
            errors: [t('profile.password.currentIncorrect')],
          },
        ]);
        return;
      }
      applyFieldErrors(form, error, ['newPassword']);
    },
  });
  const errorMessage = useErrorMessage(change.error);
  const showBanner =
    change.isError &&
    !(
      change.error instanceof ApiError &&
      hasFieldErrors(change.error, ['currentPassword', 'newPassword'])
    );

  return (
    <section className={styles.section} aria-labelledby="profile-password">
      <h2 id="profile-password" className={styles.sectionTitle}>
        {t('profile.password.title')}
      </h2>
      <div className={styles.sectionBody}>
        {showBanner && (
          <Alert className={styles.notice} type="error" title={errorMessage} />
        )}
        <Form<PasswordValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          disabled={change.isPending}
          onFinish={({ currentPassword, newPassword }) =>
            change.mutate({ currentPassword, newPassword })
          }
        >
          <Form.Item
            name="currentPassword"
            label={t('auth.fields.currentPassword')}
            rules={[
              {
                required: true,
                message: t('auth.validation.passwordRequired'),
              },
            ]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label={t('auth.fields.newPassword')}
            rules={newPasswordRules(t)}
            extra={t('auth.passwordHint', { min: PASSWORD_MIN_LENGTH })}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label={t('auth.fields.confirmPassword')}
            dependencies={['newPassword']}
            rules={confirmPasswordRules(t, 'newPassword')}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button htmlType="submit" loading={change.isPending}>
            {t('profile.password.submit')}
          </Button>
        </Form>
      </div>
    </section>
  );
}
