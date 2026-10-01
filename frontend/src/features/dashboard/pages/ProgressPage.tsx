import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { PageLoader } from '../../../components/feedback/PageLoader';
import { ListPager } from '../../../components/ListPager';
import { PageHeader } from '../../../components/PageHeader';
import {
  lastPage,
  type ListParams,
  listSearch,
  parseListParams,
} from '../../learning/list-params';
import { useContentLanguage, useSkills } from '../../learning/queries';
import { SkillFilter } from '../../learning/SkillFilter';
import { TranslationNote } from '../../learning/TranslationNote';
import { CourseReport } from '../CourseReport';
import { useProgress } from '../queries';
import styles from '../Progress.module.scss';

export function ProgressPage() {
  const { t } = useTranslation();
  const lang = useContentLanguage();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const params = parseListParams(search);

  const skills = useSkills();
  const progress = useProgress({ ...params, lang });

  const go = (target: ListParams) =>
    navigate({ pathname: '/progress', search: listSearch(target) });

  // A page past the end (e.g. after a bigger page size): show the last one.
  const pastEnd =
    progress.data &&
    progress.data.items.length === 0 &&
    progress.data.total > 0 &&
    params.page > 1;
  useEffect(() => {
    if (!pastEnd || !progress.data) return;
    navigate(
      {
        pathname: '/progress',
        search: listSearch({
          ...params,
          page: lastPage(progress.data.total, params.pageSize),
        }),
      },
      { replace: true },
    );
  });

  const header = (
    <PageHeader
      title={t('pages.progress.title')}
      description={t('pages.progress.description')}
    />
  );

  if (skills.isPending || progress.isPending) {
    return (
      <>
        {header}
        <PageLoader />
      </>
    );
  }

  if (skills.isError || progress.isError) {
    return (
      <>
        {header}
        <ErrorState
          error={skills.error ?? progress.error}
          onRetry={() => {
            void skills.refetch();
            void progress.refetch();
          }}
        />
      </>
    );
  }

  const page = progress.data;
  if (!params.skill && page.total === 0) {
    return (
      <>
        {header}
        <EmptyState description={t('progress.empty')} />
      </>
    );
  }

  return (
    <>
      {header}
      <TranslationNote status={page.translation} />
      <SkillFilter pathname="/progress" skills={skills.data} params={params} />

      {page.items.length === 0 ? (
        <p className={styles.muted} data-testid="progress-empty">
          {t('progress.emptySkill')}
        </p>
      ) : (
        <div aria-busy={progress.isPlaceholderData} data-testid="progress-list">
          {page.items.map((course) => (
            <CourseReport key={course.id} course={course} />
          ))}
        </div>
      )}

      {page.total > 0 && (
        <ListPager
          page={page.page}
          pageSize={page.pageSize}
          total={page.total}
          count={page.items.length}
          rangeTestId="progress-range"
          rangeLabel={(range) => t('progress.range', range)}
          sizeLabel={t('progress.pageSizeLabel')}
          optionLabel={(size) => t('learning.list.pageSize', { count: size })}
          onChange={(next) => go({ ...params, ...next })}
        />
      )}
    </>
  );
}
