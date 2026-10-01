import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { DashboardStreak, OverallProgress } from '../../types/api';
import { dayToDate } from './dashboard';
import styles from './Dashboard.module.scss';

interface SummaryFiguresProps {
  overall: OverallProgress;
  streak: DashboardStreak;
}

/**
 * The test summary report of your learning: four figures in one ruled row
 * (a 2 × 2 grid on mobile), the streak with its last 14 days.
 */
export function SummaryFigures({ overall, streak }: SummaryFiguresProps) {
  const { t } = useTranslation();
  const { exercises } = overall;

  const streakNote = streak.activeToday
    ? t('dashboard.summary.streakToday')
    : streak.current > 0
      ? t('dashboard.summary.streakKeep')
      : t('dashboard.summary.streakStart');

  return (
    <section aria-labelledby="summary-title" data-testid="summary">
      <h2 id="summary-title" className={styles.visuallyHidden}>
        {t('dashboard.summary.label')}
      </h2>
      <dl className={styles.figures}>
        <Figure
          testId="figure-lessons"
          label={t('dashboard.summary.lessons')}
          value={overall.completedLessons}
          unit={t('dashboard.summary.of', { total: overall.totalLessons })}
          note={t('dashboard.summary.lessonsPercent', {
            percent: overall.percent,
          })}
        />
        <Figure
          testId="figure-exercises"
          label={t('dashboard.summary.exercises')}
          value={exercises.passed}
          unit={t('dashboard.summary.exercisesAnswered', {
            count: exercises.attempted,
          })}
          note={t('dashboard.summary.exercisesTotal', {
            count: exercises.total,
          })}
        />
        <Figure
          testId="figure-average"
          label={t('dashboard.summary.average')}
          value={exercises.averageScore ?? '–'}
          note={
            exercises.averageScore === null
              ? t('dashboard.summary.averageNone')
              : t('dashboard.summary.averageHint')
          }
        />
        <Figure
          testId="figure-streak"
          label={t('dashboard.summary.streak')}
          value={streak.current}
          unit={t('dashboard.summary.streakDays', { count: streak.current })}
          note={
            <>
              {streakNote}{' '}
              {streak.longest > 0 &&
                t('dashboard.summary.streakLongest', { count: streak.longest })}
            </>
          }
        >
          <StreakDays days={streak.days} />
        </Figure>
      </dl>
    </section>
  );
}

function Figure({
  label,
  value,
  unit,
  note,
  testId,
  children,
}: {
  label: string;
  value: number | string;
  unit?: string;
  note: ReactNode;
  testId: string;
  children?: ReactNode;
}) {
  return (
    <div className={styles.figure} data-testid={testId}>
      <dt className={styles.figureLabel}>{label}</dt>
      <dd className={styles.figureBody}>
        <p className={styles.figureValue}>
          <span data-testid={`${testId}-value`}>{value}</span>
          {unit && <span className={styles.figureUnit}>{unit}</span>}
        </p>
        <p className={styles.figureNote}>{note}</p>
        {children}
      </dd>
    </div>
  );
}

/** The last 14 days as a run of cells: filled = studied; today is marked. */
function StreakDays({ days }: { days: DashboardStreak['days'] }) {
  const { t, i18n } = useTranslation();
  const format = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <ol
      className={styles.days}
      aria-label={t('dashboard.summary.daysLabel', { count: days.length })}
      data-testid="streak-days"
    >
      {days.map((day, index) => {
        const label = t(
          day.active
            ? 'dashboard.summary.dayActive'
            : 'dashboard.summary.dayInactive',
          { date: format.format(dayToDate(day.date)) },
        );
        return (
          <li
            key={day.date}
            className={styles.day}
            data-active={day.active}
            data-today={index === days.length - 1 || undefined}
            title={label}
            aria-label={label}
          />
        );
      })}
    </ol>
  );
}
