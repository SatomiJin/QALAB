import { Card } from 'antd';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../components/feedback/EmptyState';
import { PageHeader } from '../components/PageHeader';
import type { TranslationSchema } from '../i18n/locales/en';

export type PageKey = keyof TranslationSchema['pages'];

interface PlaceholderPageProps {
  page: PageKey;
  phase: number;
}

/** Temporary page for routes whose feature lands in a later phase. */
export function PlaceholderPage({ page, phase }: PlaceholderPageProps) {
  const { t } = useTranslation();
  const description = t(`pages.${page}.description`);

  return (
    <>
      <PageHeader
        title={t(`pages.${page}.title`)}
        description={description || undefined}
      />
      <Card>
        <EmptyState description={t('placeholder.comingInPhase', { phase })} />
      </Card>
    </>
  );
}
