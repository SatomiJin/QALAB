import type { ReactNode } from 'react';
import styles from './SideLayout.module.scss';

interface SideLayoutProps {
  /** State and actions of the page: a sticky side panel from 1200px. */
  aside: ReactNode;
  asideLabel: string;
  children: ReactNode;
  asideTestId?: string;
}

/**
 * Main column plus a 280px side panel from 1200px (a wide screen is not
 * left half empty). Below that the panel comes first, in the page flow.
 * CSS only: the tree is the same at every width, so forms keep their state
 * when the window is resized.
 */
export function SideLayout({
  aside,
  asideLabel,
  children,
  asideTestId,
}: SideLayoutProps) {
  return (
    <div className={styles.layout}>
      <div className={styles.main}>{children}</div>
      <aside
        className={styles.aside}
        aria-label={asideLabel}
        data-testid={asideTestId}
      >
        {aside}
      </aside>
    </div>
  );
}
