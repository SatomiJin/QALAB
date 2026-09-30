import { useTranslation } from 'react-i18next';
import type { ContentStatus } from '../../types/api';
import styles from './Admin.module.scss';

/**
 * Content status (draft / published / archived). Not a test result, so it
 * never takes a verdict colour.
 */
export function StatusTag({ status }: { status: ContentStatus }) {
  const { t } = useTranslation();
  return (
    <span className={`${styles.status} ${styles[status]}`} data-status={status}>
      {t(`admin.status.${status}`)}
    </span>
  );
}
