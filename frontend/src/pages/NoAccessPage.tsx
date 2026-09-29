import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { BugReport } from '../components/BugReport';

export function NoAccessPage() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  return (
    <BugReport
      title={t('errors.noAccessTitle')}
      expected={t('errors.noAccessExpected', { path: pathname })}
      actual={t('errors.noAccessActual')}
    />
  );
}
