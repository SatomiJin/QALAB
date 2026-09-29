import { Button, Result } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useDocumentTitle(t('errors.notFoundTitle'));

  return (
    <Result
      status="404"
      title={t('errors.notFoundTitle')}
      subTitle={t('errors.notFoundDescription')}
      extra={
        <Button type="primary" onClick={() => navigate('/dashboard')}>
          {t('errors.goToDashboard')}
        </Button>
      }
    />
  );
}
