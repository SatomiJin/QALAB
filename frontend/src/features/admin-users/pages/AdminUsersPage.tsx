import { Button, Input, Select } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { PageLoader } from '../../../components/feedback/PageLoader';
import { ListPager } from '../../../components/ListPager';
import { PageHeader } from '../../../components/PageHeader';
import {
  type AdminUserSummary,
  USER_ROLES,
  USER_SEARCH_MAX_LENGTH,
  USER_STATUSES,
  type UserRole,
  type UserStatus,
} from '../../../types/api';
import adminStyles from '../../admin/Admin.module.scss';
import { useAuth } from '../../auth/auth-context';
import { lastPage } from '../../learning/list-params';
import { AccountTag } from '../AccountTag';
import styles from '../AdminUsers.module.scss';
import { useAdminUsers } from '../queries';
import type { AdminUserListParams } from '../users-api';
import {
  parseUserListParams,
  rememberUserList,
  userListSearch,
} from '../users';

/** Admin → Users: every account, searchable and filterable, newest first. */
export function AdminUsersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [search] = useSearchParams();
  const params = parseUserListParams(search);
  const users = useAdminUsers(params);

  useEffect(() => {
    rememberUserList(location.search);
  }, [location.search]);

  const go = (target: AdminUserListParams, replace = false) =>
    navigate(
      { pathname: '/admin/users', search: userListSearch(target).toString() },
      { replace },
    );

  // Past the end (e.g. after filtering): move to the last page.
  const data = users.data;
  useEffect(() => {
    if (!data || data.items.length > 0 || data.total === 0 || params.page === 1)
      return;
    void go({ ...params, page: lastPage(data.total, params.pageSize) }, true);
  });

  const header = (
    <PageHeader
      title={t('adminUsers.title')}
      description={t('adminUsers.description')}
    />
  );
  const filters = (
    <Filters params={params} onChange={(next) => go({ ...next, page: 1 })} />
  );

  if (users.isPending) {
    return (
      <>
        {header}
        {filters}
        <PageLoader />
      </>
    );
  }
  if (users.isError) {
    return (
      <>
        {header}
        {filters}
        <ErrorState error={users.error} onRetry={() => void users.refetch()} />
      </>
    );
  }

  const page = users.data;
  const filtered = Boolean(params.search || params.role || params.status);

  return (
    <>
      {header}
      {filters}
      {page.total === 0 && !filtered ? (
        <EmptyState description={t('adminUsers.empty')} />
      ) : page.items.length === 0 ? (
        <div data-testid="users-empty" data-state="empty">
          <p className={adminStyles.muted}>{t('adminUsers.emptyFiltered')}</p>
          <Button
            type="link"
            onClick={() => go({ page: 1, pageSize: params.pageSize })}
          >
            {t('adminUsers.clearFilters')}
          </Button>
        </div>
      ) : (
        <ul
          className={adminStyles.cards}
          aria-busy={users.isPlaceholderData}
          data-testid="admin-user-list"
        >
          {page.items.map((user) => (
            <li key={user.id}>
              <UserCard user={user} />
            </li>
          ))}
        </ul>
      )}

      {page.total > 0 && (
        <ListPager
          page={page.page}
          pageSize={page.pageSize}
          total={page.total}
          count={page.items.length}
          rangeTestId="admin-user-range"
          rangeLabel={(range) => t('adminUsers.range', range)}
          sizeLabel={t('adminUsers.pageSize')}
          optionLabel={(size) => t('adminUsers.perPage', { size })}
          onChange={(next) => go({ ...params, ...next })}
        />
      )}
    </>
  );
}

function UserCard({ user }: { user: AdminUserSummary }) {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const date = (value: string) =>
    new Date(value).toLocaleDateString(i18n.language);

  return (
    <article
      className={adminStyles.card}
      data-testid="admin-user"
      data-user-id={user.id}
    >
      <div className={adminStyles.cardBody}>
        <span className={styles.name}>
          <Link to={`/admin/users/${user.id}`} className={adminStyles.cardLink}>
            {user.displayName}
          </Link>
          {user.role === 'admin' && (
            <span className={styles.roleMark} data-testid="role-admin">
              {t('adminUsers.role.admin')}
            </span>
          )}
          {profile?.id === user.id && (
            <span className={styles.roleMark}>{t('adminUsers.you')}</span>
          )}
        </span>
        <p className={adminStyles.meta}>
          <span className={styles.email}>{user.email}</span>
          <span>{t('adminUsers.joined', { date: date(user.createdAt) })}</span>
          <span>
            {user.lastSignInAt
              ? t('adminUsers.lastSignIn', { date: date(user.lastSignInAt) })
              : t('adminUsers.neverSignedIn')}
          </span>
          <span className={adminStyles.count}>
            {t('adminUsers.lessons', { count: user.lessonsCompleted })}
          </span>
          <span className={adminStyles.count}>
            {t('adminUsers.exercises', { count: user.exercisesAttempted })}
          </span>
        </p>
      </div>
      <AccountTag status={user.status} />
    </article>
  );
}

function Filters({
  params,
  onChange,
}: {
  params: AdminUserListParams;
  onChange: (next: AdminUserListParams) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className={adminStyles.filters} role="search">
      <Input.Search
        // Remounts when the URL changes (back / clear filters).
        key={params.search ?? ''}
        className={styles.search}
        defaultValue={params.search}
        placeholder={t('adminUsers.searchPlaceholder')}
        aria-label={t('adminUsers.searchLabel')}
        maxLength={USER_SEARCH_MAX_LENGTH}
        allowClear
        data-testid="user-search"
        onSearch={(value) =>
          onChange({ ...params, search: value.trim() || undefined })
        }
      />
      <Select<UserRole | ''>
        value={params.role ?? ''}
        aria-label={t('adminUsers.filterRole')}
        data-testid="filter-role"
        options={[
          { value: '', label: t('adminUsers.allRoles') },
          ...USER_ROLES.map((role) => ({
            value: role,
            label: t(`adminUsers.role.${role}`),
          })),
        ]}
        onChange={(role) => onChange({ ...params, role: role || undefined })}
      />
      <Select<UserStatus | ''>
        value={params.status ?? ''}
        aria-label={t('adminUsers.filterStatus')}
        data-testid="filter-account-status"
        options={[
          { value: '', label: t('adminUsers.allStatuses') },
          ...USER_STATUSES.map((status) => ({
            value: status,
            label: t(`adminUsers.status.${status}`),
          })),
        ]}
        onChange={(status) =>
          onChange({ ...params, status: status || undefined })
        }
      />
    </div>
  );
}
