import { useNavigation } from 'react-router';
import styles from './NavigationBar.module.scss';

/**
 * Thin bar at the top of the window while the next page's code loads (pages
 * are lazy routes). It shows only after a short delay, so fast navigations
 * do not flash it.
 */
export function NavigationBar() {
  const { state } = useNavigation();
  if (state !== 'loading') return null;
  return (
    <div className={styles.bar} data-testid="navigation-bar" aria-hidden />
  );
}
