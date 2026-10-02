import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { VerdictTag } from '../../components/VerdictTag';
import { DEFAULT_PAGE_SIZE, type SkillProgress } from '../../types/api';
import { listSearch } from '../learning/list-params';
import { verdictFor } from '../learning/progress';
import { useSkillText } from '../learning/useSkillText';
import styles from './Dashboard.module.scss';

/** Nothing opened and nothing answered yet. */
function isIdle(skill: SkillProgress) {
  return (
    skill.status === 'not_started' && skill.exercises.averageScore === null
  );
}

/**
 * Every skill as a row: lessons (with a bar), exercises, average, status.
 * On phones the skills not started yet fold into one muted line.
 */
export function SkillTable({ skills }: { skills: SkillProgress[] }) {
  const { t } = useTranslation();
  const skillText = useSkillText();
  const idle = skills.filter(isIdle);
  const progressLink = (code: string) => ({
    pathname: '/progress',
    search: listSearch({ skill: code, page: 1, pageSize: DEFAULT_PAGE_SIZE }),
  });

  return (
    <section className={styles.section} aria-labelledby="skills-title">
      <h2 id="skills-title" className={styles.sectionTitle}>
        {t('dashboard.skills.title')}
      </h2>
      <table className={styles.skills} data-testid="skill-table">
        <thead>
          <tr>
            <th scope="col">{t('dashboard.skills.skill')}</th>
            <th scope="col">{t('dashboard.skills.lessons')}</th>
            <th scope="col">{t('dashboard.skills.exercises')}</th>
            <th scope="col" className={styles.numeric}>
              {t('dashboard.skills.average')}
            </th>
            <th scope="col">{t('dashboard.skills.status')}</th>
          </tr>
        </thead>
        <tbody>
          {skills.map((skill) => (
            <tr
              key={skill.code}
              data-testid="skill-row"
              data-skill={skill.code}
              data-idle={isIdle(skill)}
            >
              <th scope="row" className={styles.skillName}>
                <Link to={progressLink(skill.code)}>
                  {skillText(skill).name}
                </Link>
              </th>
              <td className={styles.skillLessons}>
                {skill.totalLessons === 0 ? (
                  <span className={styles.muted}>
                    {t('dashboard.skills.noLessons')}
                  </span>
                ) : (
                  <>
                    <span
                      className={styles.bar}
                      role="img"
                      aria-label={t('dashboard.skills.lessonsBar', {
                        percent: skill.percent,
                      })}
                    >
                      <span
                        className={styles.barFill}
                        style={{ width: `${skill.percent}%` }}
                      />
                    </span>
                    <span className={styles.count}>
                      {t('dashboard.skills.done', {
                        done: skill.completedLessons,
                        total: skill.totalLessons,
                      })}
                    </span>
                  </>
                )}
              </td>
              <td className={styles.skillExercises}>
                {skill.exercises.total === 0 ? (
                  <span className={styles.muted}>
                    {t('dashboard.skills.noExercises')}
                  </span>
                ) : (
                  <span className={styles.count}>
                    {t('dashboard.skills.passed', {
                      passed: skill.exercises.passed,
                      total: skill.exercises.total,
                    })}
                  </span>
                )}
              </td>
              <td
                className={`${styles.numeric} ${styles.skillAverage}`}
                data-empty={skill.exercises.averageScore === null}
              >
                {skill.exercises.averageScore === null ? (
                  <span className={styles.muted} aria-hidden="true">
                    –
                  </span>
                ) : (
                  <>
                    <span className={styles.cellLabel}>
                      {t('dashboard.skills.average')}
                    </span>
                    {skill.exercises.averageScore}
                  </>
                )}
              </td>
              <td className={styles.skillStatus}>
                <VerdictTag verdict={verdictFor(skill.status)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {idle.length > 0 && (
        <p className={styles.idleSkills} data-testid="skills-not-started">
          <span>{t('dashboard.skills.notStarted')}</span>{' '}
          {idle.map((skill, index) => (
            <span key={skill.code}>
              {index > 0 && ', '}
              <Link to={progressLink(skill.code)}>{skillText(skill).name}</Link>
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
