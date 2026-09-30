import { useTranslation } from 'react-i18next';
import type { ContentStatus } from '../../types/api';
import styles from './Admin.module.scss';
import { StatusTag } from './StatusTag';

interface StatusLineProps {
  status: ContentStatus;
  /** The item and every parent are published. */
  visible: boolean;
  inUse: boolean;
}

/** Under an editor's title: status, whether learners see it, learner data. */
export function StatusLine({ status, visible, inUse }: StatusLineProps) {
  const { t } = useTranslation();
  return (
    <span className={styles.statusLine} data-testid="status-line">
      <StatusTag status={status} />
      <span
        data-testid="visibility"
        data-state={visible ? 'visible' : 'hidden'}
      >
        {visible ? t('admin.visible') : t('admin.hidden')}
      </span>
      {inUse && <span data-testid="in-use">{t('admin.inUse')}</span>}
    </span>
  );
}
