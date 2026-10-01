import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { VerdictTag } from '../../components/VerdictTag';
import type { CourseResult, LessonResult } from '../../types/api';
import { lessonNumber, verdictFor } from '../learning/progress';
import { useSkillText } from '../learning/useSkillText';
import { exerciseVerdict, plainText } from '../practice/kinds';
import styles from './Progress.module.scss';

/**
 * One course as a traceability matrix: modules as sections, lessons as
 * numbered rows, each lesson's exercises under it with their results.
 */
export function CourseReport({ course }: { course: CourseResult }) {
  const { t } = useTranslation();
  const skillText = useSkillText();
  const titleId = `course-${course.id}`;
  const { exercises } = course;

  return (
    <section
      className={styles.course}
      aria-labelledby={titleId}
      data-testid="course-report"
      data-course={course.slug}
    >
      <h2 id={titleId} className={styles.courseTitle}>
        <Link to={`/learning/courses/${course.slug}`}>{course.title}</Link>
      </h2>
      <div className={styles.meta}>
        <VerdictTag verdict={verdictFor(course.progress.status)} />
        <span className={styles.count}>
          {t('learning.lessonsDone', {
            done: course.progress.completedLessons,
            total: course.progress.totalLessons,
          })}
        </span>
        {exercises.total > 0 && (
          <span className={styles.count}>
            {t('progress.exercises', {
              passed: exercises.passed,
              total: exercises.total,
            })}
          </span>
        )}
        {exercises.averageScore !== null && (
          <span className={styles.count}>
            {t('progress.average', { score: exercises.averageScore })}
          </span>
        )}
        <span>{skillText(course.skill).name}</span>
      </div>

      {course.modules.map((module, moduleIndex) => (
        <div key={module.id} className={styles.module}>
          <h3 className={styles.moduleTitle}>
            <span className={styles.moduleNumber}>
              {t('learning.course.moduleNumber', { number: moduleIndex + 1 })}
            </span>
            <span>{module.title}</span>
          </h3>
          {module.lessons.length === 0 ? (
            <p className={styles.muted}>{t('learning.course.noLessons')}</p>
          ) : (
            <ol
              className={styles.lessons}
              aria-label={t('progress.lessonsLabel', { course: module.title })}
            >
              {module.lessons.map((lesson, lessonIndex) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  number={lessonNumber(moduleIndex, lessonIndex)}
                />
              ))}
            </ol>
          )}
        </div>
      ))}
    </section>
  );
}

function LessonRow({
  lesson,
  number,
}: {
  lesson: LessonResult;
  number: string;
}) {
  const { t } = useTranslation();
  const { progress } = lesson;

  return (
    <li className={styles.lesson} data-testid="lesson-result">
      <div className={styles.row}>
        <span className={styles.number}>{number}</span>
        <div className={styles.rowMain}>
          <Link to={`/learning/lessons/${lesson.id}`} className={styles.title}>
            {lesson.title}
          </Link>
        </div>
        <span className={`${styles.rowStats} ${styles.count}`}>
          {progress.status === 'in_progress' && progress.progressPercent > 0
            ? t('progress.read', { percent: progress.progressPercent })
            : t('learning.minutes', { count: lesson.estimatedMinutes })}
        </span>
        <span className={styles.verdict}>
          <VerdictTag verdict={verdictFor(progress.status)} />
        </span>
      </div>
      {lesson.exercises.length > 0 && (
        <ul className={styles.exercises}>
          {lesson.exercises.map((exercise) => (
            <li
              key={exercise.id}
              className={`${styles.row} ${styles.exercise}`}
              data-testid="exercise-result"
            >
              <span aria-hidden="true" />
              <div className={styles.rowMain}>
                <Link
                  to={`/practice/exercises/${exercise.id}`}
                  className={styles.question}
                >
                  {plainText(exercise.question)}
                </Link>
                <span className={styles.meta}>
                  <span>{t(`practice.types.${exercise.type}`)}</span>
                  <span>{t(`practice.difficulty.${exercise.difficulty}`)}</span>
                </span>
              </div>
              <span className={`${styles.rowStats} ${styles.count}`}>
                {exercise.stats.bestScore !== null && (
                  <span>
                    {t('practice.list.best', {
                      score: exercise.stats.bestScore,
                    })}
                  </span>
                )}
                {exercise.stats.attemptCount > 0 && (
                  <span>
                    {t('practice.list.attempts', {
                      count: exercise.stats.attemptCount,
                    })}
                  </span>
                )}
              </span>
              <span className={styles.verdict}>
                <VerdictTag verdict={exerciseVerdict(exercise.stats)} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
