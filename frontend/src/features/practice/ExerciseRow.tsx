import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { VerdictTag } from '../../components/VerdictTag';
import type { ExerciseSummary } from '../../types/api';
import { exerciseVerdict, plainText } from './kinds';
import styles from './Practice.module.scss';

interface ExerciseRowProps {
  exercise: ExerciseSummary;
  /** Show where the exercise comes from (lists across lessons). */
  showLesson?: boolean;
}

/** One exercise in a list: question, type, difficulty, your best score, verdict. */
export function ExerciseRow({ exercise, showLesson = true }: ExerciseRowProps) {
  const { t } = useTranslation();
  const { stats } = exercise;

  return (
    <li
      className={styles.row}
      data-testid="exercise-item"
      data-exercise-type={exercise.type}
    >
      <div className={styles.rowMain}>
        <Link
          to={`/practice/exercises/${exercise.id}`}
          className={styles.rowTitle}
        >
          {plainText(exercise.question)}
        </Link>
        <div className={styles.meta}>
          <span>{t(`practice.types.${exercise.type}`)}</span>
          <span>{t(`practice.difficulty.${exercise.difficulty}`)}</span>
          {showLesson && <span>{exercise.lesson.title}</span>}
        </div>
      </div>
      <div className={styles.rowStats}>
        {stats.bestScore !== null && (
          <div>{t('practice.list.best', { score: stats.bestScore })}</div>
        )}
        {stats.attemptCount > 0 && (
          <div>
            {t('practice.list.attempts', { count: stats.attemptCount })}
          </div>
        )}
      </div>
      <span className={styles.rowVerdict}>
        <VerdictTag verdict={exerciseVerdict(stats)} />
      </span>
    </li>
  );
}
