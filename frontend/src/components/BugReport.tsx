import { Button } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import styles from './BugReport.module.scss';

interface BugReportProps {
  title: string;
  expected: ReactNode;
  actual: ReactNode;
}

/** 404 / 403 written as a tiny bug report, because they are one. */
export function BugReport({ title, expected, actual }: BugReportProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useDocumentTitle(title);

  return (
    <section className={styles.report} data-testid="bug-report">
      <h1 className={styles.title}>{title}</h1>
      <dl className={styles.fields}>
        <dt>{t('errors.expected')}</dt>
        <dd>{expected}</dd>
        <dt>{t('errors.actual')}</dt>
        <dd>{actual}</dd>
      </dl>
      <Button type="primary" onClick={() => navigate('/dashboard')}>
        {t('errors.goToDashboard')}
      </Button>
    </section>
  );
}
