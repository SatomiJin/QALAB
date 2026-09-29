import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { BugReport } from '../components/BugReport';

export function NotFoundPage() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  return (
    <BugReport
      title={t('errors.notFoundTitle')}
      expected={t('errors.notFoundExpected', { path: pathname })}
      actual={t('errors.notFoundActual')}
    />
  );
}
