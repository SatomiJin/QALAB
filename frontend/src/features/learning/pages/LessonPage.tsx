import { Alert, Button, Grid } from 'antd';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { PageLoader } from '../../../components/feedback/PageLoader';
import { PageHeader } from '../../../components/PageHeader';
import { PageTrail } from '../../../components/PageTrail';
import { VerdictTag } from '../../../components/VerdictTag';
import { useErrorMessage } from '../../../hooks/useErrorMessage';
import { ApiError } from '../../../lib/api';
import { NotFoundPage } from '../../../pages/NotFoundPage';
import type { Lesson, LessonRef } from '../../../types/api';
import { LessonExercises } from '../../practice/LessonExercises';
import { LessonMarkdown } from '../LessonMarkdown';
import { learningListPath } from '../list-params';
import { verdictFor } from '../progress';
import { useContentLanguage, useLesson, useRecordProgress } from '../queries';
import { TranslationNote } from '../TranslationNote';
import { useReadingProgress } from '../useReadingProgress';
import { useReadPercent } from '../useReadPercent';
import shared from '../Learning.module.scss';
import styles from './LessonPage.module.scss';

export function LessonPage() {
  const { lessonId = '' } = useParams();
  const contentLanguage = useContentLanguage();
  // Vietnamese UI: the learner may switch a lesson to the English original.
  const [showOriginal, setShowOriginal] = useState(false);
  const original = contentLanguage === 'vi' && showOriginal;
  const lesson = useLesson(lessonId, original ? 'en' : contentLanguage);

  if (lesson.isPending) return <PageLoader />;
  if (lesson.error) {
    if (
      lesson.error instanceof ApiError &&
      (lesson.error.status === 404 || lesson.error.status === 400)
    ) {
      return <NotFoundPage />;
    }
    return (
      <ErrorState error={lesson.error} onRetry={() => void lesson.refetch()} />
    );
  }

  // Keyed by id: moving to the next lesson starts a fresh reading session.
  return (
    <LessonView
      key={lesson.data.id}
      lesson={lesson.data}
      showingOriginal={original}
      onToggleOriginal={
        contentLanguage === 'vi'
          ? () => setShowOriginal((value) => !value)
          : undefined
      }
    />
  );
}

/** Read this far on a phone and the action bar slides in. */
const BAR_FROM_PERCENT = 80;

/**
 * Where the lesson's actions (Mark as complete, next lesson) sit: a side
 * column from 1200px, a bar along the bottom on phones, else the footer.
 * Only one place renders them, so the page keeps a single primary button.
 */
type ActionsPlace = 'aside' | 'footer' | 'bar';

function LessonView({
  lesson,
  showingOriginal,
  onToggleOriginal,
}: {
  lesson: Lesson;
  showingOriginal: boolean;
  onToggleOriginal?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const articleRef = useRef<HTMLElement>(null);
  const track = useRecordProgress(lesson.id);
  const complete = useRecordProgress(lesson.id);
  const completeError = useErrorMessage(complete.error);
  const screens = Grid.useBreakpoint();
  const place: ActionsPlace = screens.xl
    ? 'aside'
    : screens.md === false
      ? 'bar'
      : 'footer';
  const readPercent = useReadPercent(articleRef);

  // Background tracking: a failed update is retried by the next one.
  useReadingProgress({
    lessonId: lesson.id,
    initialPercent: lesson.progress.progressPercent,
    completed: lesson.progress.status === 'completed',
    articleRef,
    record: track.mutate,
  });

  const { progress } = lesson;
  const coursePath = `/learning/courses/${lesson.course.slug}`;
  const completed = progress.status === 'completed';
  const canResume =
    progress.status === 'in_progress' &&
    progress.progressPercent >= 10 &&
    progress.progressPercent < 100;

  const jumpToProgress = () => {
    const article = articleRef.current;
    if (!article) return;
    const rect = article.getBoundingClientRect();
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    window.scrollTo({
      top:
        window.scrollY +
        rect.top +
        (rect.height * progress.progressPercent) / 100 -
        window.innerHeight,
      behavior: reduce ? 'auto' : 'smooth',
    });
  };

  const completeAction = (
    <div className={styles.completeRow}>
      <Button
        type="primary"
        size="large"
        loading={complete.isPending}
        onClick={() => complete.mutate({ complete: true })}
        data-testid="complete-lesson"
      >
        {t('learning.lesson.complete')}
      </Button>
      {complete.isError && (
        <Alert
          type="error"
          showIcon
          title={t('learning.lesson.completeFailed')}
          description={completeError}
        />
      )}
    </div>
  );

  const nextLink = lesson.nextLesson ? (
    <Link to={`/learning/lessons/${lesson.nextLesson.id}`}>
      {t('learning.lesson.next')}
    </Link>
  ) : (
    <Link to={coursePath}>{t('learning.lesson.backToCourse')}</Link>
  );

  const showBar =
    place === 'bar' && (completed || readPercent >= BAR_FROM_PERCENT);

  return (
    <>
      <PageTrail
        back={{ to: coursePath, label: t('learning.lesson.backToLessons') }}
        items={[
          { label: t('learning.title'), to: learningListPath() },
          { label: lesson.course.title, to: coursePath },
          { label: lesson.title },
        ]}
      />

      <PageHeader title={lesson.title} />

      <div className={styles.status}>
        <div className={shared.meta}>
          <span data-testid="lesson-status" data-state={progress.status}>
            <VerdictTag verdict={verdictFor(progress.status)} />
          </span>
          <span>{lesson.module.title}</span>
          <span>
            {t('learning.lesson.readingTime', {
              count: lesson.estimatedMinutes,
            })}
          </span>
        </div>
        {canResume && (
          <Button
            type="link"
            className={styles.resume}
            onClick={jumpToProgress}
          >
            {t('learning.lesson.resumeAt', {
              percent: progress.progressPercent,
            })}
          </Button>
        )}
      </div>

      <div className={styles.layout}>
        <div className={styles.body}>
          <TranslationNote
            status={lesson.translation}
            showingOriginal={showingOriginal}
            onToggle={onToggleOriginal}
          />

          <article ref={articleRef} className={styles.article}>
            {lesson.contentMd.trim() ? (
              <LessonMarkdown source={lesson.contentMd} linkTerms />
            ) : (
              <EmptyState description={t('learning.lesson.empty')} />
            )}
          </article>

          <LessonExercises lessonId={lesson.id} />

          <footer className={styles.footer}>
            {completed ? (
              <p className={styles.done} data-testid="lesson-completed">
                <VerdictTag verdict="pass" />
                <span>
                  {progress.completedAt &&
                    t('learning.lesson.completedOn', {
                      date: new Intl.DateTimeFormat(i18n.language, {
                        dateStyle: 'long',
                      }).format(new Date(progress.completedAt)),
                    })}
                </span>
              </p>
            ) : (
              place === 'footer' && completeAction
            )}

            <nav
              aria-label={t('learning.lesson.neighbours')}
              className={styles.neighbours}
            >
              <Neighbour
                lesson={lesson.previousLesson}
                label={t('learning.lesson.previous')}
              />
              {lesson.nextLesson ? (
                <Neighbour
                  lesson={lesson.nextLesson}
                  label={t('learning.lesson.next')}
                  align="end"
                />
              ) : (
                <Link
                  to={`/learning/courses/${lesson.course.slug}`}
                  className={`${styles.neighbour} ${styles.end}`}
                >
                  <span className={styles.neighbourLabel}>
                    {t('learning.lesson.backToCourse')}
                  </span>
                  <span className={styles.neighbourTitle}>
                    {lesson.course.title}
                  </span>
                </Link>
              )}
            </nav>
          </footer>
        </div>

        {place === 'aside' && (
          <aside
            className={styles.aside}
            aria-label={t('learning.lesson.actions')}
            data-testid="lesson-aside"
          >
            <p className={styles.asideState}>
              {completed ? (
                <VerdictTag verdict="pass" />
              ) : (
                <span className={shared.count}>
                  {t('learning.continue.read', { percent: readPercent })}
                </span>
              )}
            </p>
            {!completed && completeAction}
            <p className={styles.asideNext}>{nextLink}</p>
          </aside>
        )}
      </div>

      {place === 'bar' && (
        <>
          {/* Room under the footer, so the bar never covers its links. */}
          <div className={styles.barSpace} aria-hidden="true" />
          <div
            className={styles.bar}
            data-shown={showBar}
            role="region"
            aria-label={t('learning.lesson.actions')}
            data-testid="lesson-bar"
            // Off screen until it slides in: keep it out of the tab order.
            inert={!showBar}
          >
            {!completed && completeAction}
            <span className={styles.barNext}>{nextLink}</span>
          </div>
        </>
      )}
    </>
  );
}

function Neighbour({
  lesson,
  label,
  align = 'start',
}: {
  lesson: LessonRef | null;
  label: string;
  align?: 'start' | 'end';
}) {
  if (!lesson) return <span />;
  return (
    <Link
      to={`/learning/lessons/${lesson.id}`}
      className={`${styles.neighbour} ${align === 'end' ? styles.end : ''}`}
    >
      <span className={styles.neighbourLabel}>{label}</span>
      <span className={styles.neighbourTitle}>{lesson.title}</span>
    </Link>
  );
}
