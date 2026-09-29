import type { ReactNode } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import styles from './PageHeader.module.scss';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  extra?: ReactNode;
}

export function PageHeader({ title, description, extra }: PageHeaderProps) {
  useDocumentTitle(title);

  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.title}>{title}</h1>
        {description && <div className={styles.description}>{description}</div>}
      </div>
      {extra}
    </header>
  );
}
