import { Button, Result } from 'antd';
import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { NotFoundPage } from './NotFoundPage';

/** Rendered by the router when a route throws while loading or rendering. */
export function RouteErrorPage() {
  const { t } = useTranslation();
  const error = useRouteError();
  useDocumentTitle(t('errors.crashTitle'));

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />;
  }

  console.error('Route error', error);

  return (
    <Result
      status="500"
      title={t('errors.crashTitle')}
      subTitle={t('errors.routeErrorDescription')}
      extra={[
        <Button
          key="retry"
          type="primary"
          onClick={() => window.location.reload()}
        >
          {t('feedback.tryAgain')}
        </Button>,
        <Button key="home" href="/dashboard">
          {t('errors.goToDashboard')}
        </Button>,
      ]}
    />
  );
}
