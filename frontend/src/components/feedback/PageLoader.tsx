import { Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from './feedback.module.scss';

interface PageLoaderProps {
  label?: string;
}

export function PageLoader({ label }: PageLoaderProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.center} role="status" aria-live="polite">
      <Spin size="large" />
      <span className={styles.label}>{label ?? t('feedback.loading')}</span>
    </div>
  );
}
