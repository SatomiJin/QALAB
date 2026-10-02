import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../../hooks/useErrorMessage';
import { VerdictTag } from '../VerdictTag';
import styles from './feedback.module.scss';

interface ErrorStateProps {
  error: unknown;
  title?: string;
  onRetry?: () => void;
}

/**
 * Data could not be loaded: reported like a test that could not run
 * (Blocked), with what happened and the way out.
 */
export function ErrorState({ error, title, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();
  const message = useErrorMessage(error);

  return (
    <div className={styles.state} role="alert" data-state="error">
      <div className={styles.heading}>
        <VerdictTag verdict="blocked" />
        <h2 className={styles.title}>{title ?? t('feedback.loadFailed')}</h2>
      </div>
      <p className={styles.description}>{message}</p>
      {onRetry && (
        <div className={styles.action}>
          <Button type="primary" onClick={onRetry}>
            {t('feedback.tryAgain')}
          </Button>
        </div>
      )}
    </div>
  );
}
