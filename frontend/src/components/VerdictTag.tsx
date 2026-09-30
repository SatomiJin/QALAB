import { useTranslation } from 'react-i18next';
import styles from './VerdictTag.module.scss';

export type Verdict = 'pass' | 'fail' | 'blocked' | 'notRun' | 'inProgress';

interface VerdictTagProps {
  verdict: Verdict;
}

/**
 * The only coloured chip in the UI: a test verdict. Lessons, exercises and
 * progress all use the same states (see docs/design.md). `inProgress` is
 * outlined, not coloured: it is not a result yet.
 */
export function VerdictTag({ verdict }: VerdictTagProps) {
  const { t } = useTranslation();

  return (
    <span className={`${styles.tag} ${styles[verdict]}`} data-verdict={verdict}>
      {t(`verdict.${verdict}`)}
    </span>
  );
}
