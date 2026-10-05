import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { PageLoader } from '../../../components/feedback/PageLoader';
import { PageHeader } from '../../../components/PageHeader';
import { VerdictTag } from '../../../components/VerdictTag';
import { ApiError } from '../../../lib/api';
import { NotFoundPage } from '../../../pages/NotFoundPage';
import type { AdminLesson } from '../../../types/api';
import shared from '../../learning/Learning.module.scss';
import { LessonMarkdown } from '../../learning/LessonMarkdown';
import lessonStyles from '../../learning/pages/LessonPage.module.scss';
import { plainText } from '../../practice/kinds';
import practiceStyles from '../../practice/Practice.module.scss';
import styles from '../Admin.module.scss';
import { useAdminLesson } from '../queries';
import { StatusLine } from '../StatusLine';
import { LessonTrail } from './AdminLessonPage';

/**
 * Preview as learner: the saved lesson (draft or not) laid out as the lesson
 * page, with the exercises learners would see. Nothing is recorded.
 */
export function AdminLessonPreviewPage() {
  const { lessonId = '' } = useParams();
  const lesson = useAdminLesson(lessonId);

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
  return <Preview lesson={lesson.data} />;
}

function Preview({ lesson }: { lesson: AdminLesson }) {
  const { t } = useTranslation();
  // Learners see only published exercises.
  const exercises = lesson.exercises.filter((e) => e.status === 'published');

  return (
    <>
      <LessonTrail
        lesson={lesson}
        current={t('admin.lesson.previewAsLearner')}
      />
      <div className={styles.previewNote} data-testid="preview-note">
        <span className={styles.cardBody}>
          <span>{t('admin.preview.banner')}</span>
          <StatusLine
            status={lesson.status}
            visible={lesson.visibleToLearners}
            inUse={lesson.inUse}
          />
        </span>
        <Link to={`/admin/lessons/${lesson.id}`}>
          {t('admin.preview.back')}
        </Link>
      </div>

      <PageHeader title={lesson.title} />
      <div className={lessonStyles.status}>
        <div className={shared.meta}>
          <VerdictTag verdict="notRun" />
          <span>{lesson.module.title}</span>
          <span>
            {t('learning.lesson.readingTime', {
              count: lesson.estimatedMinutes,
            })}
          </span>
        </div>
      </div>

      <article className={lessonStyles.article}>
        {lesson.contentMd.trim() ? (
          <LessonMarkdown source={lesson.contentMd} linkTerms />
        ) : (
          <EmptyState description={t('learning.lesson.empty')} />
        )}
      </article>

      {exercises.length > 0 && (
        <section
          className={practiceStyles.lessonPractice}
          data-testid="preview-exercises"
        >
          <h2 className={practiceStyles.sectionTitle}>
            {t('practice.lesson.title')}
          </h2>
          <ul className={practiceStyles.cards}>
            {exercises.map((exercise) => (
              <li
                key={exercise.id}
                className={practiceStyles.row}
                data-testid="exercise-item"
              >
                <div className={practiceStyles.rowMain}>
                  <span className={practiceStyles.rowTitle}>
                    {plainText(exercise.question)}
                  </span>
                  <div className={practiceStyles.meta}>
                    <span>{t(`practice.types.${exercise.type}`)}</span>
                    <span>
                      {t(`practice.difficulty.${exercise.difficulty}`)}
                    </span>
                  </div>
                </div>
                {/* No attempts in a preview: the stats column stays empty. */}
                <div className={practiceStyles.rowStats} />
                <span className={practiceStyles.rowVerdict}>
                  <VerdictTag verdict="notRun" />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
