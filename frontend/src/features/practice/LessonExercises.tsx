import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useContentLanguage } from '../learning/queries';
import { ExerciseRow } from './ExerciseRow';
import { useExercises } from './queries';
import styles from './Practice.module.scss';

/**
 * "Practise this lesson" under a lesson. Optional content: nothing while it
 * loads or when the lesson has no exercises; a retry line if it fails.
 */
export function LessonExercises({ lessonId }: { lessonId: string }) {
  const { t } = useTranslation();
  const lang = useContentLanguage();
  const exercises = useExercises({ lessonId, page: 1, pageSize: 20, lang });

  if (exercises.isPending) return null;
  if (exercises.isError) {
    return (
      <p className={`${styles.muted} ${styles.lessonPractice}`}>
        {t('practice.lesson.loadFailed')}{' '}
        <Button
          type="link"
          className={styles.linkButton}
          onClick={() => void exercises.refetch()}
        >
          {t('feedback.tryAgain')}
        </Button>
      </p>
    );
  }
  if (exercises.data.items.length === 0) return null;

  return (
    <section
      className={styles.lessonPractice}
      aria-labelledby="lesson-practice-title"
      data-testid="lesson-exercises"
    >
      <h2 id="lesson-practice-title" className={styles.sectionTitle}>
        {t('practice.lesson.title')}
      </h2>
      <ul className={styles.cards}>
        {exercises.data.items.map((exercise) => (
          <ExerciseRow
            key={exercise.id}
            exercise={exercise}
            showLesson={false}
          />
        ))}
      </ul>
    </section>
  );
}
