import { Button, Result } from 'antd';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../../hooks/useErrorMessage';

interface ErrorStateProps {
  error: unknown;
  title?: string;
  onRetry?: () => void;
}

export function ErrorState({ error, title, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();
  const message = useErrorMessage(error);

  return (
    <Result
      status="error"
      title={title ?? t('feedback.loadFailed')}
      subTitle={message}
      extra={
        onRetry && (
          <Button type="primary" onClick={onRetry}>
            {t('feedback.tryAgain')}
          </Button>
        )
      }
    />
  );
}
