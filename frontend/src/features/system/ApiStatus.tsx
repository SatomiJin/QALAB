import { Badge, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../../hooks/useErrorMessage';
import { useHealth } from './useHealth';

/** Small indicator showing whether the backend API is reachable. */
export function ApiStatus() {
  const { t } = useTranslation();
  const { isPending, isError, error } = useHealth();
  const errorMessage = useErrorMessage(error);

  let state: 'pending' | 'offline' | 'online' = 'online';
  let badge = <Badge status="success" text={t('apiStatus.online')} />;
  if (isPending) {
    state = 'pending';
    badge = <Badge status="processing" text={t('apiStatus.connecting')} />;
  } else if (isError) {
    state = 'offline';
    badge = (
      <Tooltip title={errorMessage}>
        <Badge status="error" text={t('apiStatus.offline')} />
      </Tooltip>
    );
  }

  // `data-state` gives tests a language-independent hook.
  return (
    <span data-testid="api-status" data-state={state} role="status">
      {badge}
    </span>
  );
}
