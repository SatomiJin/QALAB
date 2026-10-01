import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { PageLoader } from '../../../components/feedback/PageLoader';
import { PageHeader } from '../../../components/PageHeader';
import { ContinueBlock } from '../../learning/ContinueBlock';
import { useContentLanguage } from '../../learning/queries';
import { TranslationNote } from '../../learning/TranslationNote';
import { ActivityLog } from '../ActivityLog';
import { browserTimeZone } from '../dashboard';
import { useDashboard } from '../queries';
import { RetestSection } from '../RetestSection';
import { SkillTable } from '../SkillTable';
import { SummaryFigures } from '../SummaryFigures';

export function DashboardPage() {
  const { t } = useTranslation();
  const lang = useContentLanguage();
  // Streak days are counted in the learner's own time zone.
  const [timeZone] = useState(browserTimeZone);
  const dashboard = useDashboard(lang, timeZone);

  const header = (
    <PageHeader
      title={t('pages.dashboard.title')}
      description={t('pages.dashboard.description')}
    />
  );

  if (dashboard.isPending) {
    return (
      <>
        {header}
        <PageLoader />
      </>
    );
  }

  if (dashboard.isError) {
    return (
      <>
        {header}
        <ErrorState
          error={dashboard.error}
          onRetry={() => void dashboard.refetch()}
        />
      </>
    );
  }

  const data = dashboard.data;
  if (data.overall.totalLessons === 0) {
    return (
      <>
        {header}
        <EmptyState description={t('learning.empty')} />
      </>
    );
  }

  return (
    <>
      {header}
      <TranslationNote status={data.translation} />
      <ContinueBlock item={data.continue} />
      <SummaryFigures overall={data.overall} streak={data.streak} />
      <SkillTable skills={data.skills} />
      <RetestSection
        weakAreas={data.weakAreas}
        attempted={data.overall.exercises.attempted}
      />
      <ActivityLog items={data.recentActivity} />
    </>
  );
}
