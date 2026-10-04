import { App, Button, Select } from 'antd';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { PageLoader } from '../../../components/feedback/PageLoader';
import { PageHeader } from '../../../components/PageHeader';
import { PageTrail } from '../../../components/PageTrail';
import { SideLayout } from '../../../components/SideLayout';
import { VerdictTag } from '../../../components/VerdictTag';
import { errorMessage } from '../../../hooks/useErrorMessage';
import { ApiError } from '../../../lib/api';
import { NotFoundPage } from '../../../pages/NotFoundPage';
import {
  type AdminAuditEntry,
  type AdminUser,
  type AdminUserAttempt,
  USER_ROLES,
  type UserRole,
} from '../../../types/api';
import adminStyles from '../../admin/Admin.module.scss';
import { useAuth } from '../../auth/auth-context';
import { SkillTable } from '../../dashboard/SkillTable';
import { plainText } from '../../practice/kinds';
import { AccountTag } from '../AccountTag';
import styles from '../AdminUsers.module.scss';
import { useAdminUser, useUserMutation } from '../queries';
import { allowedActions, auditRole, userListPath } from '../users';
import { usersApi } from '../users-api';

/** Admin → user: account facts, progress, attempts, history, role and status. */
export function AdminUserPage() {
  const { userId = '' } = useParams();
  const user = useAdminUser(userId);

  if (user.isPending) return <PageLoader />;
  if (user.isError) {
    if (
      user.error instanceof ApiError &&
      (user.error.status === 404 || user.error.status === 400)
    ) {
      return <NotFoundPage />;
    }
    return (
      <>
        <UserTrail />
        <ErrorState error={user.error} onRetry={() => void user.refetch()} />
      </>
    );
  }
  return <UserView key={user.data.id} user={user.data} />;
}

function UserTrail({ name }: { name?: string }) {
  const { t } = useTranslation();
  const listPath = userListPath();
  return (
    <PageTrail
      back={{ to: listPath, label: t('adminUsers.back') }}
      items={[
        { label: t('adminUsers.title'), to: listPath },
        ...(name ? [{ label: name }] : []),
      ]}
    />
  );
}

function UserView({ user }: { user: AdminUser }) {
  const { t } = useTranslation();

  return (
    <>
      <UserTrail name={user.displayName} />
      <PageHeader
        title={user.displayName}
        description={
          <span className={adminStyles.statusLine} data-testid="user-status">
            <AccountTag status={user.status} />
            <span>{t(`adminUsers.role.${user.role}`)}</span>
            <span className={styles.email}>{user.email}</span>
          </span>
        }
      />
      <SideLayout
        asideLabel={t('adminUsers.actions.title')}
        asideTestId="user-actions"
        aside={<ManageAccount user={user} />}
      >
        <AccountFacts user={user} />
        <SkillTable skills={user.skills} linked={false} />
        <Attempts attempts={user.recentAttempts} />
        <History entries={user.auditLog} />
      </SideLayout>
    </>
  );
}

function AccountFacts({ user }: { user: AdminUser }) {
  const { t, i18n } = useTranslation();
  const dateTime = (value: string) =>
    new Date(value).toLocaleString(i18n.language, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  const notSet = (
    <span className={adminStyles.muted}>{t('adminUsers.account.notSet')}</span>
  );

  const facts: [string, ReactNode][] = [
    [t('adminUsers.account.email'), user.email],
    [t('adminUsers.account.role'), t(`adminUsers.role.${user.role}`)],
    [
      t('adminUsers.account.status'),
      <AccountTag key="status" status={user.status} />,
    ],
    [t('adminUsers.account.joined'), dateTime(user.createdAt)],
    [
      t('adminUsers.account.lastSignIn'),
      user.lastSignInAt
        ? dateTime(user.lastSignInAt)
        : t('adminUsers.neverSignedIn'),
    ],
    [
      t('adminUsers.account.experienceLevel'),
      user.experienceLevel
        ? t(`profile.levels.${user.experienceLevel}`)
        : notSet,
    ],
    [
      t('adminUsers.account.learningGoals'),
      user.learningGoals.length > 0 ? user.learningGoals.join(', ') : notSet,
    ],
  ];

  return (
    <section className={adminStyles.section} aria-labelledby="user-account">
      <div className={adminStyles.sectionHead}>
        <h2 id="user-account">{t('adminUsers.account.title')}</h2>
      </div>
      <dl className={styles.facts} data-testid="user-facts">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function useLogTime() {
  const { i18n } = useTranslation();
  const format = new Intl.DateTimeFormat(i18n.language, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  return (value: string) => format.format(new Date(value));
}

function Attempts({ attempts }: { attempts: AdminUserAttempt[] }) {
  const { t } = useTranslation();
  const time = useLogTime();

  return (
    <section className={adminStyles.section} aria-labelledby="user-attempts">
      <div className={adminStyles.sectionHead}>
        <h2 id="user-attempts">{t('adminUsers.attempts.title')}</h2>
      </div>
      {attempts.length === 0 ? (
        <p className={adminStyles.muted} data-testid="attempts-empty">
          {t('adminUsers.attempts.empty')}
        </p>
      ) : (
        <ol className={styles.log} data-testid="user-attempts">
          {attempts.map((attempt) => (
            <li
              key={attempt.id}
              className={styles.logRow}
              data-testid="user-attempt"
            >
              <time className={styles.logTime} dateTime={attempt.attemptedAt}>
                {time(attempt.attemptedAt)}
              </time>
              <div className={styles.logMain}>
                {attempt.exerciseType && (
                  <span className={styles.logKind}>
                    {t(`practice.types.${attempt.exerciseType}`)}
                  </span>
                )}
                {attempt.question !== null ? (
                  <Link
                    to={`/admin/exercises/${attempt.exerciseId}`}
                    className={styles.logTitle}
                  >
                    {plainText(attempt.question)}
                  </Link>
                ) : (
                  <span className={adminStyles.muted}>
                    {t('adminUsers.attempts.unknownExercise')}
                  </span>
                )}
              </div>
              <div className={styles.logResult}>
                <span className={adminStyles.count}>
                  {t('adminUsers.attempts.score', { score: attempt.score })}
                </span>
                <VerdictTag verdict={attempt.isCorrect ? 'pass' : 'fail'} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function History({ entries }: { entries: AdminAuditEntry[] }) {
  const { t } = useTranslation();
  const time = useLogTime();
  const roleName = (value: string | null) => {
    const role = auditRole(value);
    return role ? t(`adminUsers.role.${role}`) : (value ?? '');
  };

  return (
    <section className={adminStyles.section} aria-labelledby="user-history">
      <div className={adminStyles.sectionHead}>
        <h2 id="user-history">{t('adminUsers.audit.title')}</h2>
      </div>
      {entries.length === 0 ? (
        <p className={adminStyles.muted} data-testid="audit-empty">
          {t('adminUsers.audit.empty')}
        </p>
      ) : (
        <ol className={styles.log} data-testid="user-audit">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className={styles.logRow}
              data-testid="audit-entry"
              data-action={entry.action}
            >
              <time className={styles.logTime} dateTime={entry.createdAt}>
                {time(entry.createdAt)}
              </time>
              <div className={styles.logMain}>
                <span>
                  {entry.action === 'role_changed'
                    ? t('adminUsers.audit.roleChanged', {
                        from: roleName(entry.from),
                        to: roleName(entry.to),
                      })
                    : t(`adminUsers.audit.${entry.action}`)}
                </span>
                <span className={styles.logKind}>
                  {entry.actor
                    ? t('adminUsers.audit.by', {
                        name: entry.actor.displayName,
                      })
                    : t('adminUsers.audit.byDeleted')}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ManageAccount({ user }: { user: AdminUser }) {
  const { t } = useTranslation();
  const { modal, message } = App.useApp();
  const { profile } = useAuth();
  const allowed = allowedActions(profile?.id, user);
  const [role, setRole] = useState<UserRole>(user.role);
  const changeRole = useUserMutation((next: UserRole) =>
    usersApi.changeRole(user.id, { role: next }),
  );
  const setDisabled = useUserMutation((disabled: boolean) =>
    usersApi.setDisabled(user.id, disabled),
  );

  const fail = (error: unknown) => void message.error(errorMessage(error, t));

  if (allowed.self) {
    return (
      <div className={styles.manage}>
        <p className={styles.hint} data-testid="manage-self">
          {t('adminUsers.actions.self')}
        </p>
      </div>
    );
  }

  const confirmRole = () => {
    const copy =
      role === 'admin'
        ? 'adminUsers.actions.promoteConfirm'
        : 'adminUsers.actions.demoteConfirm';
    modal.confirm({
      title: t(`${copy}.title`, { name: user.displayName }),
      content: t(`${copy}.body`),
      okText: t(`${copy}.ok`),
      okButtonProps: { 'data-testid': 'confirm-role' },
      cancelText: t('admin.cancel'),
      onOk: () =>
        changeRole
          .mutateAsync(role)
          .then(() => void message.success(t('adminUsers.actions.roleChanged')))
          .catch((error: unknown) => {
            setRole(user.role);
            fail(error);
          }),
    });
  };

  const confirmDisable = () =>
    modal.confirm({
      title: t('adminUsers.actions.disableConfirm.title', {
        name: user.displayName,
      }),
      content: t('adminUsers.actions.disableConfirm.body'),
      okText: t('adminUsers.actions.disableConfirm.ok'),
      okButtonProps: { danger: true, 'data-testid': 'confirm-disable' },
      cancelText: t('admin.cancel'),
      onOk: () =>
        setDisabled
          .mutateAsync(true)
          .then(() => void message.success(t('adminUsers.actions.disabled')))
          .catch(fail),
    });

  const enable = () =>
    setDisabled.mutate(false, {
      onSuccess: () => void message.success(t('adminUsers.actions.enabled')),
      onError: fail,
    });

  return (
    <div className={styles.manage}>
      <div className={styles.manageBlock}>
        <label htmlFor="user-role">{t('adminUsers.actions.roleLabel')}</label>
        <div className={styles.roleRow}>
          <Select<UserRole>
            id="user-role"
            value={role}
            data-testid="role-select"
            options={USER_ROLES.map((value) => ({
              value,
              label: t(`adminUsers.role.${value}`),
              disabled: value === 'admin' && !allowed.promote,
            }))}
            onChange={setRole}
          />
          <Button
            onClick={confirmRole}
            disabled={role === user.role}
            loading={changeRole.isPending}
            data-testid="change-role"
          >
            {t('adminUsers.actions.changeRole')}
          </Button>
        </div>
        {!allowed.promote && user.role !== 'admin' && (
          <p className={styles.hint}>{t('adminUsers.actions.disabledHint')}</p>
        )}
      </div>

      <div className={styles.manageBlock}>
        {user.disabled ? (
          <Button
            onClick={enable}
            loading={setDisabled.isPending}
            data-testid="enable-user"
          >
            {t('adminUsers.actions.enable')}
          </Button>
        ) : (
          <>
            <Button
              danger
              type="text"
              onClick={confirmDisable}
              disabled={!allowed.disable}
              loading={setDisabled.isPending}
              data-testid="disable-user"
            >
              {t('adminUsers.actions.disable')}
            </Button>
            {user.role === 'admin' && (
              <p className={styles.hint}>{t('adminUsers.actions.adminHint')}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
