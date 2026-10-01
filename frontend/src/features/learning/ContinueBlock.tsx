import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { VerdictTag } from '../../components/VerdictTag';
import type { ContinueItem } from '../../types/api';
import styles from './Learning.module.scss';

/** The one "do this next" on the page (highlighter, primary button). */
export function ContinueBlock({ item }: { item: ContinueItem | null }) {
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
