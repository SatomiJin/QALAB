import { useTranslation } from 'react-i18next';
import styles from './VerdictTag.module.scss';

export type Verdict = 'pass' | 'fail' | 'blocked' | 'notRun';

interface VerdictTagProps {
  verdict: Verdict;
}

/**
 * The only coloured chip in the UI: a test verdict. Lessons, exercises and
 * progress all use the same four states (see docs/design.md).
 */
export function VerdictTag({ verdict }: VerdictTagProps) {
  const { t } = useTranslation();

  return (
    <span className={`${styles.tag} ${styles[verdict]}`} data-verdict={verdict}>
      {t(`verdict.${verdict}`)}
    </span>
  );
}
