import type { ReactNode } from 'react';
import styles from './feedback.module.scss';

interface EmptyStateProps {
  description: ReactNode;
  action?: ReactNode;
}

/** Nothing to show yet: one muted sentence (what will appear and how), left aligned like the page. */
export function EmptyState({ description, action }: EmptyStateProps) {
  return (
    <div className={styles.state} data-state="empty">
      <p className={styles.description}>{description}</p>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
