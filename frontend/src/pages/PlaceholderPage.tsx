import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/PageHeader';
import { VerdictTag } from '../components/VerdictTag';
import type { TranslationSchema } from '../i18n/locales/en';
import styles from './PlaceholderPage.module.scss';

export type PageKey = keyof TranslationSchema['pages'];

interface PlaceholderPageProps {
  page: PageKey;
  phase: number;
}

/** Temporary page for routes whose feature lands in a later phase. */
export function PlaceholderPage({ page, phase }: PlaceholderPageProps) {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader title={t(`pages.${page}.title`)} />
      <p className={styles.status} data-testid="placeholder">
        <VerdictTag verdict="notRun" />
        <span>
          {t(`pages.${page}.description`)}{' '}
          {t('placeholder.opensInPhase', { phase })}
        </span>
      </p>
    </>
  );
}
