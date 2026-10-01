import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { VerdictTag } from '../../components/VerdictTag';
import { type Dashboard, PASS_SCORE } from '../../types/api';
import { useSkillText } from '../learning/useSkillText';
import styles from './Dashboard.module.scss';

interface RetestSectionProps {
  weakAreas: Dashboard['weakAreas'];
  /** Exercises answered so far: without answers there is nothing to judge. */
  attempted: number;
}

/**
 * Weak areas, in QA terms: what failed and needs a retest. Skills below the
 * pass mark with the exercise to retry, and concepts the best answers missed.
 */
export function RetestSection({ weakAreas, attempted }: RetestSectionProps) {
  const { t } = useTranslation();
  const skillText = useSkillText();

  return (
    <section
      className={styles.section}
      aria-labelledby="retest-title"
      data-testid="retest"
    >
      <h2 id="retest-title" className={styles.sectionTitle}>
        {t('dashboard.retest.title')}
      </h2>
      {attempted === 0 ? (
        <p className={styles.muted} data-testid="retest-empty">
          {t('dashboard.retest.noAnswers')}
        </p>
      ) : (
        <>
          <p className={styles.sectionDescription}>
            {t('dashboard.retest.description', { pass: PASS_SCORE })}
          </p>
          <div className={styles.retest}>
            <div>
              <h3 className={styles.subTitle}>
                {t('dashboard.retest.skills', { pass: PASS_SCORE })}
              </h3>
              {weakAreas.skills.length === 0 ? (
                <p className={styles.muted}>
                  {t('dashboard.retest.noSkills', { pass: PASS_SCORE })}
                </p>
              ) : (
                <ul className={styles.rows}>
                  {weakAreas.skills.map((skill) => (
                    <li
                      key={skill.code}
                      className={styles.weakSkill}
                      data-testid="weak-skill"
                    >
                      <div className={styles.weakMain}>
                        <span className={styles.weakName}>
                          {skillText(skill).name}
                        </span>
                        <span className={styles.meta}>
                          <span className={styles.count}>
                            {t('dashboard.retest.average', {
                              score: skill.averageScore,
                            })}
                          </span>
                          <span className={styles.count}>
                            {t('dashboard.retest.passedOf', {
                              passed: skill.passedExercises,
                              attempted: skill.attemptedExercises,
                            })}
                          </span>
                        </span>
                        {skill.retry && (
                          <span className={styles.meta}>
                            <Link
                              to={`/practice/exercises/${skill.retry.id}`}
                              data-testid="retry-link"
                            >
                              {t('dashboard.retest.retry', {
                                type: t(`practice.types.${skill.retry.type}`),
                              })}
                            </Link>
                            <span className={styles.count}>
                              {t('dashboard.retest.retryBest', {
                                score: skill.retry.bestScore,
                              })}
                            </span>
                          </span>
                        )}
                      </div>
                      <VerdictTag verdict="fail" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className={styles.subTitle}>
                {t('dashboard.retest.concepts')}
              </h3>
              {weakAreas.concepts.length === 0 ? (
                <p className={styles.muted}>
                  {t('dashboard.retest.noConcepts')}
                </p>
              ) : (
                <ul className={styles.rows}>
                  {weakAreas.concepts.map((concept) => (
                    <li
                      key={concept.concept}
                      className={styles.concept}
                      data-testid="weak-concept"
                    >
                      <span className={styles.weakName}>{concept.concept}</span>
                      <span className={`${styles.meta} ${styles.count}`}>
                        {t('dashboard.retest.missed', {
                          missed: concept.missed,
                          checked: concept.checked,
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
