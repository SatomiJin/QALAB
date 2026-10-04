import { useTranslation } from 'react-i18next';
import type { UserStatus } from '../../types/api';
import adminStyles from '../admin/Admin.module.scss';

/** Same stamps as content status: active outlined, unverified grey, disabled dashed. */
const STAMP: Record<UserStatus, string> = {
  active: adminStyles.published,
  unverified: adminStyles.draft,
  disabled: adminStyles.archived,
};

/**
 * Account status. Not a test result, so it is a neutral stamp like the
 * content status, never a verdict colour.
 */
export function AccountTag({ status }: { status: UserStatus }) {
  const { t } = useTranslation();
  return (
    <span
      className={`${adminStyles.status} ${STAMP[status]}`}
      data-account-status={status}
    >
      {t(`adminUsers.status.${status}`)}
    </span>
  );
}
