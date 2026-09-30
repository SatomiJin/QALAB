import { Button } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { PageLoader } from '../../../components/feedback/PageLoader';
import { PageHeader } from '../../../components/PageHeader';
import { VerdictTag } from '../../../components/VerdictTag';
import { ListPager } from '../../../components/ListPager';
import type { ContinueItem, CourseSummary, Skill } from '../../../types/api';
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

      <SkillFilter skills={skills.data} params={params} />

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

function SkillFilter({
  skills,
  params,
}: {
  skills: Skill[];
  params: ListParams;
}) {
  const { t } = useTranslation();
  const skillText = useSkillText();
  const tabs = [
    { code: undefined, label: t('learning.list.all') },
    ...skills.map((skill) => ({
      code: skill.code,
      label: skillText(skill).name,
    })),
  ];

  return (
    <nav
      aria-label={t('learning.list.filterLabel')}
      className={styles.filter}
      data-testid="skill-filter"
    >
      {tabs.map((tab) => {
        const active = tab.code === params.skill;
        return (
          <Link
            key={tab.code ?? 'all'}
            to={{
              pathname: '/learning',
              search: listSearch({ ...params, skill: tab.code, page: 1 }),
            }}
            className={
              active
                ? `${styles.filterTab} ${styles.filterActive}`
                : styles.filterTab
            }
            aria-current={active ? 'page' : undefined}
            data-skill={tab.code ?? 'all'}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
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

/** The one "do this next" on the page (highlighter, primary button). */
function ContinueBlock({ item }: { item: ContinueItem | null }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!item) {
    return (
      <p className={styles.allDone} data-testid="continue" data-state="done">
        <VerdictTag verdict="pass" />
        <span>{t('learning.continue.allDone')}</span>
      </p>
    );
  }

  const percent = item.progress.progressPercent;
  return (
    <section
      className={styles.continue}
      aria-label={t('learning.continue.label')}
      data-testid="continue"
      data-state={item.reason}
    >
      <div className={styles.continueText}>
        <p className={styles.continueReason}>
          {t(`learning.continue.${item.reason}`)}
        </p>
        <p className={styles.continueTitle}>
          <Link to={`/learning/lessons/${item.lessonId}`}>
            <mark className={styles.mark}>{item.lessonTitle}</mark>
          </Link>
        </p>
        <p className={styles.trail}>
          <span>{item.course.title}</span>
          <span>{item.module.title}</span>
        </p>
        <div className={styles.meta}>
          <span>{t('learning.minutes', { count: item.estimatedMinutes })}</span>
          {item.reason === 'resume' && percent > 0 && (
            <span className={styles.count}>
              {t('learning.continue.read', { percent })}
            </span>
          )}
        </div>
      </div>
      <Button
        type="primary"
        size="large"
        onClick={() => navigate(`/learning/lessons/${item.lessonId}`)}
      >
        {item.reason === 'resume'
          ? t('learning.continue.resumeAction')
          : t('learning.continue.startAction')}
      </Button>
    </section>
  );
}
