import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { ContinueBlock } from '../ContinueBlock';
import { SkillFilter } from '../SkillFilter';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { PageLoader } from '../../../components/feedback/PageLoader';
import { PageHeader } from '../../../components/PageHeader';
import { VerdictTag } from '../../../components/VerdictTag';
import { ListPager } from '../../../components/ListPager';
import type { CourseSummary } from '../../../types/api';
import {
  lastPage,
  type ListParams,
  listSearch,
  parseListParams,
  rememberListSearch,
} from '../list-params';
import { verdictFor } from '../progress';
import {
  useContentLanguage,
  useContinue,
  useCourses,
  useSkills,
} from '../queries';
import { TranslationNote } from '../TranslationNote';
import { useSkillText } from '../useSkillText';
import styles from '../Learning.module.scss';

export function LearningPage() {
  const { t } = useTranslation();
  const lang = useContentLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [search] = useSearchParams();
  const params = parseListParams(search);

  const skills = useSkills();
  const courses = useCourses({ ...params, lang });
  const next = useContinue(lang);

  // Course and lesson pages send "back" to this exact list.
  useEffect(() => {
    rememberListSearch(location.search);
  }, [location.search]);

  const go = (target: ListParams) =>
    navigate({ pathname: '/learning', search: listSearch(target) });

  // A page past the end (e.g. after a bigger page size): show the last one.
  const pastEnd =
    courses.data &&
    courses.data.items.length === 0 &&
    courses.data.total > 0 &&
    params.page > 1;
  useEffect(() => {
    if (!pastEnd || !courses.data) return;
    navigate(
      {
        pathname: '/learning',
        search: listSearch({
          ...params,
          page: lastPage(courses.data.total, params.pageSize),
        }),
      },
      { replace: true },
    );
  });

  const header = (
    <PageHeader
      title={t('learning.title')}
      description={t('learning.description')}
    />
  );

  if (skills.isPending || courses.isPending || next.isPending) {
    return (
      <>
        {header}
        <PageLoader />
      </>
    );
  }

  if (skills.isError || courses.isError || next.isError) {
    return (
      <>
        {header}
        <ErrorState
          error={skills.error ?? courses.error ?? next.error}
          onRetry={() => {
            void skills.refetch();
            void courses.refetch();
            void next.refetch();
          }}
        />
      </>
    );
  }

  const page = courses.data;
  const nothingPublished = !params.skill && page.total === 0;
  if (nothingPublished) {
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
      <TranslationNote status={page.translation} />
      <ContinueBlock item={next.data.item} />

      <SkillFilter pathname="/learning" skills={skills.data} params={params} />

      {page.items.length === 0 ? (
        <p className={styles.muted} data-testid="courses-empty">
          {t('learning.list.emptySkill')}
        </p>
      ) : (
        <ul
          className={styles.flatList}
          aria-busy={courses.isPlaceholderData}
          data-testid="course-list"
        >
          {page.items.map((course) => (
            <CourseItem key={course.id} course={course} />
          ))}
        </ul>
      )}

      {page.total > 0 && (
        <ListPager
          page={page.page}
          pageSize={page.pageSize}
          total={page.total}
          count={page.items.length}
          rangeTestId="course-range"
          rangeLabel={(range) => t('learning.list.range', range)}
          sizeLabel={t('learning.list.pageSizeLabel')}
          optionLabel={(size) => t('learning.list.pageSize', { count: size })}
          onChange={(next) => go({ ...params, ...next })}
        />
      )}
    </>
  );
}

function CourseItem({ course }: { course: CourseSummary }) {
  const { t } = useTranslation();
  const skillText = useSkillText();
  const { progress } = course;

  return (
    <li className={styles.course} data-testid="course-item">
      <Link
        to={`/learning/courses/${course.slug}`}
        className={styles.courseTitle}
      >
        {course.title}
      </Link>
      {course.description && (
        <p className={styles.courseDescription}>{course.description}</p>
      )}
      <div className={styles.meta}>
        <VerdictTag verdict={verdictFor(progress.status)} />
        <span className={styles.count}>
          {t('learning.lessonsDone', {
            done: progress.completedLessons,
            total: progress.totalLessons,
          })}
        </span>
        <span>{t('learning.minutes', { count: course.estimatedMinutes })}</span>
        <span>{skillText(course.skill).name}</span>
      </div>
    </li>
  );
}
