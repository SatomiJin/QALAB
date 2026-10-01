import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { Skill } from '../../types/api';
import { type ListParams, listSearch } from './list-params';
import { useSkillText } from './useSkillText';
import styles from './Learning.module.scss';

/** Skill tabs ("All skills" first) over a list whose state is in the URL. */
export function SkillFilter({
  pathname,
  skills,
  params,
}: {
  /** The list page the tabs link to (Learning, Progress). */
  pathname: string;
  skills: Skill[];
  params: ListParams;
}) {
  const { t } = useTranslation();
  const skillText = useSkillText();
  const tabs = [
    { code: undefined, label: t('learning.list.all') },
    ...skills.map((skill) => ({
      code: skill.code,
      label: skillText(skill).name,
    })),
  ];

  return (
    <nav
      aria-label={t('learning.list.filterLabel')}
      className={styles.filter}
      data-testid="skill-filter"
    >
      {tabs.map((tab) => {
        const active = tab.code === params.skill;
        return (
          <Link
            key={tab.code ?? 'all'}
            to={{
              pathname,
              search: listSearch({ ...params, skill: tab.code, page: 1 }),
            }}
            className={
              active
                ? `${styles.filterTab} ${styles.filterActive}`
                : styles.filterTab
            }
            aria-current={active ? 'page' : undefined}
            data-skill={tab.code ?? 'all'}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
