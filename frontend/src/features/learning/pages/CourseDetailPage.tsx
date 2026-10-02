import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { PageLoader } from '../../../components/feedback/PageLoader';
import { PageHeader } from '../../../components/PageHeader';
import { PageTrail } from '../../../components/PageTrail';
import { VerdictTag } from '../../../components/VerdictTag';
import { ApiError } from '../../../lib/api';
import { NotFoundPage } from '../../../pages/NotFoundPage';
import type { CourseDetail } from '../../../types/api';
import { learningListPath } from '../list-params';
import { lessonNumber, verdictFor } from '../progress';
import { useContentLanguage, useCourse } from '../queries';
import { TranslationNote } from '../TranslationNote';
import { useSkillText } from '../useSkillText';
import shared from '../Learning.module.scss';
import styles from './CourseDetailPage.module.scss';

export function CourseDetailPage() {
  const { slug = '' } = useParams();
  const course = useCourse(slug, useContentLanguage());

  if (course.isPending) return <PageLoader />;
  if (course.error) {
    if (course.error instanceof ApiError && course.error.status === 404) {
      return <NotFoundPage />;
    }
    return (
      <>
        <CourseTrail />
        <ErrorState
          error={course.error}
          onRetry={() => void course.refetch()}
        />
      </>
    );
  }

  return <CourseView course={course.data} />;
}

/** "Learning › Course", with back to the course list the learner came from. */
function CourseTrail({ title }: { title?: string }) {
  const { t } = useTranslation();
  const listPath = learningListPath();
  return (
    <PageTrail
      back={{ to: listPath, label: t('learning.course.backToList') }}
      items={[
        { label: t('learning.title'), to: listPath },
        ...(title ? [{ label: title }] : []),
      ]}
    />
  );
}

function CourseView({ course }: { course: CourseDetail }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const skillText = useSkillText();
  const { progress } = course;
  const firstLessonId = course.modules.flatMap((m) => m.lessons)[0]?.id;
  const target = course.nextLessonId ?? firstLessonId;

  let action = t('learning.course.start');
  if (progress.status === 'completed') action = t('learning.course.review');
  else if (progress.status === 'in_progress') {
    action = t('learning.course.continue');
  }

  return (
    <>
      <CourseTrail title={course.title} />
      <PageHeader title={course.title} description={course.description} />
      <TranslationNote status={course.translation} />

      <div className={styles.summary}>
        <div className={shared.meta}>
          <VerdictTag verdict={verdictFor(progress.status)} size="large" />
          <span className={shared.count} data-testid="course-progress">
            {t('learning.lessonsDone', {
              done: progress.completedLessons,
              total: progress.totalLessons,
            })}
          </span>
          <span>
            {t('learning.minutes', { count: course.estimatedMinutes })}
          </span>
          <span>{skillText(course.skill).name}</span>
        </div>
        {target && (
          <Button
            type={progress.status === 'completed' ? 'default' : 'primary'}
            size="large"
            className={shared.primaryAction}
            onClick={() => navigate(`/learning/lessons/${target}`)}
          >
            {action}
          </Button>
        )}
      </div>

      <div aria-label={t('learning.course.modulesLabel')} role="region">
        {course.modules.map((module, moduleIndex) => (
          <section
            key={module.id}
            className={styles.module}
            aria-labelledby={`module-${module.id}`}
          >
            <h2 id={`module-${module.id}`} className={styles.moduleTitle}>
              <span className={styles.moduleNumber}>
                {t('learning.course.moduleNumber', { number: moduleIndex + 1 })}
              </span>
              <span>{module.title}</span>
            </h2>
            {module.description && (
              <p className={styles.moduleDescription}>{module.description}</p>
            )}
            {module.lessons.length === 0 ? (
              <p className={shared.muted}>{t('learning.course.noLessons')}</p>
            ) : (
              <ol className={styles.lessons}>
                {module.lessons.map((lesson, lessonIndex) => (
                  <li
                    key={lesson.id}
                    className={styles.lesson}
                    data-testid="lesson-row"
                    data-state={lesson.progress.status}
                  >
                    <span className={styles.number}>
                      {lessonNumber(moduleIndex, lessonIndex)}
                    </span>
                    <Link
                      to={`/learning/lessons/${lesson.id}`}
                      className={styles.lessonTitle}
                    >
                      {lesson.title}
                    </Link>
                    <span className={styles.minutes}>
                      {t('learning.minutes', {
                        count: lesson.estimatedMinutes,
                      })}
                    </span>
                    <span className={styles.verdict}>
                      <VerdictTag
                        verdict={verdictFor(lesson.progress.status)}
                      />
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
