import { Button, Select } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { PageLoader } from '../../../components/feedback/PageLoader';
import { ListPager } from '../../../components/ListPager';
import { PageHeader } from '../../../components/PageHeader';
import { DIFFICULTIES, type Difficulty } from '../../../types/api';
import { lastPage } from '../../learning/list-params';
import { useContentLanguage, useSkills } from '../../learning/queries';
import { TranslationNote } from '../../learning/TranslationNote';
import { useSkillText } from '../../learning/useSkillText';
import { ExerciseRow } from '../ExerciseRow';
import {
  KIND_PATHS,
  parsePracticeParams,
  PRACTICE_KINDS,
  type PracticeKind,
  type PracticeListParams,
  practiceSearch,
  rememberPracticeSearch,
} from '../kinds';
import { useExercises } from '../queries';
import styles from '../Practice.module.scss';

/** One Practice tab: the published exercises of its types, filterable. */
export function PracticeListPage({ kind }: { kind: PracticeKind }) {
  const { t } = useTranslation();
  const lang = useContentLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [search] = useSearchParams();
  const params = parsePracticeParams(search);
  const skills = useSkills();
  const exercises = useExercises({
    types: PRACTICE_KINDS[kind],
    ...params,
    lang,
  });

  // The exercise page's back button returns to this exact list.
  useEffect(() => {
    rememberPracticeSearch(kind, location.search);
  }, [kind, location.search]);

  const go = (target: PracticeListParams) =>
    navigate({ pathname: KIND_PATHS[kind], search: practiceSearch(target) });

  // A page past the end (e.g. after a bigger page size): show the last one.
  const data = exercises.data;
  useEffect(() => {
    if (!data || data.items.length > 0 || data.total === 0 || params.page === 1)
      return;
    navigate(
      {
        pathname: KIND_PATHS[kind],
        search: practiceSearch({
          ...params,
          page: lastPage(data.total, params.pageSize),
        }),
      },
      { replace: true },
    );
  });

  const header = (
    <PageHeader
      title={t(`pages.${kind}.title`)}
      description={t(`pages.${kind}.description`)}
    />
  );

  if (exercises.isPending || skills.isPending) {
    return (
      <>
        {header}
        <PageLoader />
      </>
    );
  }
  if (exercises.isError || skills.isError) {
    return (
      <>
        {header}
        <ErrorState
          error={exercises.error ?? skills.error}
          onRetry={() => {
            void exercises.refetch();
            void skills.refetch();
          }}
        />
      </>
    );
  }

  const page = exercises.data;
  const filtered = Boolean(params.skill || params.difficulty);
  if (!filtered && page.total === 0) {
    return (
      <>
        {header}
        <EmptyState description={t('practice.list.empty')} />
      </>
    );
  }

  return (
    <>
      {header}
      <TranslationNote status={page.translation} />
      <Filters
        params={params}
        skills={skills.data}
        onChange={(next) => go({ ...next, page: 1 })}
      />

      {page.items.length === 0 ? (
        <div data-testid="exercises-empty">
          <p className={styles.muted}>{t('practice.list.emptyFilter')}</p>
          <Button
            type="link"
            className={styles.linkButton}
            onClick={() => go({ page: 1, pageSize: params.pageSize })}
          >
            {t('practice.list.clearFilters')}
          </Button>
        </div>
      ) : (
        <ul
          className={styles.cards}
          aria-busy={exercises.isPlaceholderData}
          data-testid="exercise-list"
        >
          {page.items.map((exercise) => (
            <ExerciseRow key={exercise.id} exercise={exercise} />
          ))}
        </ul>
      )}

      {page.total > 0 && (
        <ListPager
          page={page.page}
          pageSize={page.pageSize}
          total={page.total}
          count={page.items.length}
          rangeTestId="exercise-range"
          rangeLabel={(range) => t('practice.list.range', range)}
          sizeLabel={t('practice.list.pageSizeLabel')}
          optionLabel={(size) => t('learning.list.pageSize', { count: size })}
          onChange={(next) => go({ ...params, ...next })}
        />
      )}
    </>
  );
}

function Filters({
  params,
  skills,
  onChange,
}: {
  params: PracticeListParams;
  skills: { code: string; name: string }[];
  onChange: (next: PracticeListParams) => void;
}) {
  const { t } = useTranslation();
  const skillText = useSkillText();

  return (
    <div className={styles.filters}>
      <Select<string>
        value={params.skill ?? ''}
        aria-label={t('practice.list.filterSkill')}
        data-testid="filter-skill"
        options={[
          { value: '', label: t('practice.list.allSkills') },
          ...skills.map((skill) => ({
            value: skill.code,
            label: skillText(skill).name,
          })),
        ]}
        onChange={(skill) => onChange({ ...params, skill: skill || undefined })}
      />
      <Select<Difficulty | ''>
        value={params.difficulty ?? ''}
        aria-label={t('practice.list.filterDifficulty')}
        data-testid="filter-difficulty"
        options={[
          { value: '', label: t('practice.list.allDifficulties') },
          ...DIFFICULTIES.map((difficulty) => ({
            value: difficulty,
            label: t(`practice.difficulty.${difficulty}`),
          })),
        ]}
        onChange={(difficulty) =>
          onChange({ ...params, difficulty: difficulty || undefined })
        }
      />
    </div>
  );
}
