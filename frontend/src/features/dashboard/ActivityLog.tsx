import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { VerdictTag } from '../../components/VerdictTag';
import type { Activity } from '../../types/api';
import { activityPath, activityVerdict } from './dashboard';
import styles from './Dashboard.module.scss';

/** The test log: when, what, which item, and its result. Newest first. */
export function ActivityLog({ items }: { items: Activity[] }) {
  const { t, i18n } = useTranslation();
  const format = new Intl.DateTimeFormat(i18n.language, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <section className={styles.section} aria-labelledby="activity-title">
      <h2 id="activity-title" className={styles.sectionTitle}>
        {t('dashboard.activity.title')}
      </h2>
      {items.length === 0 ? (
        <p className={styles.muted} data-testid="activity-empty">
          {t('dashboard.activity.empty')}
        </p>
      ) : (
        <ol className={styles.rows} data-testid="activity-log">
          {items.map((item) => (
            <li
              key={`${item.kind}:${item.occurredAt}:${item.exercise?.id ?? item.lesson.id}`}
              className={styles.activity}
              data-testid="activity-item"
              data-kind={item.kind}
            >
              <time className={styles.activityTime} dateTime={item.occurredAt}>
                {format.format(new Date(item.occurredAt))}
              </time>
              <div className={styles.activityMain}>
                <span className={styles.activityKind}>
                  {t(`dashboard.activity.${item.kind}`)}
                </span>
                <Link to={activityPath(item)} className={styles.activityTitle}>
                  {item.exercise
                    ? t(`practice.types.${item.exercise.type}`)
                    : item.lesson.title}
                </Link>
                <span className={styles.trail}>
                  {item.exercise && <span>{item.lesson.title}</span>}
                  <span>{item.course.title}</span>
                </span>
              </div>
              <div className={styles.activityResult}>
                {item.score !== null && (
                  <span className={styles.count}>
                    {t('dashboard.activity.score', { score: item.score })}
                  </span>
                )}
                <VerdictTag verdict={activityVerdict(item)} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
