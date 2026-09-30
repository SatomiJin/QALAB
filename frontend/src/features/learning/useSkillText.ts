import { useTranslation } from 'react-i18next';
import { en } from '../../i18n/locales/en';

type SkillCode = keyof typeof en.skills;

function isKnownSkill(code: string): code is SkillCode {
  return Object.hasOwn(en.skills, code);
}

/**
 * Translated skill name and description. Skills are fixed (plant.md), so
 * their text lives in the locale files; an unknown code falls back to the
 * text from the API.
 */
export function useSkillText() {
  const { t } = useTranslation();

  return (skill: { code: string; name: string; description?: string }) =>
    isKnownSkill(skill.code)
      ? {
          name: t(`skills.${skill.code}.name`),
          description: t(`skills.${skill.code}.description`),
        }
      : { name: skill.name, description: skill.description ?? '' };
}
