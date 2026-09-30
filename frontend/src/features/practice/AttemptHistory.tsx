import { Button, Pagination } from 'antd';
import { useTranslation } from 'react-i18next';
import { VerdictTag } from '../../components/VerdictTag';
import type { Attempt, AttemptPage } from '../../types/api';
import { attemptVerdict } from './kinds';
import styles from './Practice.module.scss';

interface AttemptHistoryProps {
  page: AttemptPage | undefined;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  shownId: string | null;
  onShow: (attempt: Attempt) => void;
  onPage: (page: number) => void;
}

/** Your attempts at this exercise, newest first; any one can be shown again. */
export function AttemptHistory({
  page,
  loading,
  failed,
  onRetry,
  shownId,
  onShow,
  onPage,
}: AttemptHistoryProps) {
  const { t, i18n } = useTranslation();
  const format = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <section
      className={styles.history}
      aria-labelledby="attempts-title"
      data-testid="attempt-history"
    >
      <h2 id="attempts-title" className={styles.sectionTitle}>
        {t('practice.history.title')}
      </h2>
      {failed ? (
        <p className={styles.muted}>
          {t('practice.history.loadFailed')}{' '}
          <Button type="link" className={styles.linkButton} onClick={onRetry}>
            {t('feedback.tryAgain')}
          </Button>
        </p>
      ) : loading || !page ? (
        <p className={styles.muted}>{t('feedback.loading')}</p>
      ) : page.total === 0 ? (
        <p className={styles.muted} data-testid="attempts-empty">
          {t('practice.history.empty')}
        </p>
      ) : (
        <>
          <ul className={styles.rows}>
            {page.items.map((attempt) => (
              <li
                key={attempt.id}
                className={styles.attempt}
                data-testid="attempt-item"
              >
                <span className={styles.count}>
                  {format.format(new Date(attempt.attemptedAt))}
                </span>
                <span className={styles.attemptScore}>{attempt.score}</span>
                <span className={styles.attemptVerdict}>
                  <VerdictTag verdict={attemptVerdict(attempt.isCorrect)} />
                </span>
                <span className={styles.attemptAction}>
                  {attempt.id === shownId ? (
                    <span className={styles.muted}>
                      {t('practice.history.shown')}
                    </span>
                  ) : (
                    <Button
                      type="link"
                      className={styles.linkButton}
                      onClick={() => onShow(attempt)}
                    >
                      {t('practice.history.show')}
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {page.total > page.pageSize && (
            <div className={styles.historyPager}>
              <Pagination
                size="small"
                current={page.page}
                pageSize={page.pageSize}
                total={page.total}
                showSizeChanger={false}
                onChange={onPage}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}
