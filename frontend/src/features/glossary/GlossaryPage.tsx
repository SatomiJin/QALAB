import { Input, Select } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { PageLoader } from '../../components/feedback/PageLoader';
import { PageHeader } from '../../components/PageHeader';
import {
  type GlossaryTerm,
  SKILL_CODES,
  type SkillCode,
} from '../../types/api';
import { useContentLanguage } from '../learning/queries';
import { definition, filterTerms, groupByLetter, splitCode } from './glossary';
import { glossaryHref } from './link-terms';
import { useGlossary } from './queries';
import styles from './Glossary.module.scss';

export function GlossaryPage() {
  const { t } = useTranslation();
  const glossary = useGlossary();

  const header = (
    <PageHeader
      title={t('glossary.title')}
      description={t('glossary.description')}
    />
  );

  if (glossary.isPending) {
    return (
      <>
        {header}
        <PageLoader />
      </>
    );
  }
  if (glossary.isError) {
    return (
      <>
        {header}
        <ErrorState
          error={glossary.error}
          onRetry={() => void glossary.refetch()}
        />
      </>
    );
  }
  return (
    <>
      {header}
      {glossary.data.items.length === 0 ? (
        <EmptyState description={t('glossary.none')} />
      ) : (
        <GlossaryIndex terms={glossary.data.items} />
      )}
    </>
  );
}

function GlossaryIndex({ terms }: { terms: GlossaryTerm[] }) {
  const { t } = useTranslation();
  const lang = useContentLanguage();
  const { hash } = useLocation();
  const target = decodeURIComponent(hash.slice(1));

  const [query, setQuery] = useState('');
  const [skill, setSkill] = useState<SkillCode | ''>('');

  // Following a link to a term clears the filters, so the term is on screen.
  const [shownHash, setShownHash] = useState(hash);
  if (hash !== shownHash) {
    setShownHash(hash);
    setQuery('');
    setSkill('');
  }

  // The router does not scroll to `#id` on a same-page link, nor once the
  // terms arrive after the page.
  useEffect(() => {
    if (target) document.getElementById(target)?.scrollIntoView();
  }, [target]);

  const bySlug = new Map(terms.map((term) => [term.slug, term]));
  const shown = filterTerms(terms, query, skill, lang);
  const groups = groupByLetter(shown);

  return (
    <>
      <div className={styles.filters} role="search">
        <Input
          className={styles.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('glossary.searchPlaceholder')}
          aria-label={t('glossary.searchLabel')}
          maxLength={64}
          allowClear
          data-testid="glossary-search"
        />
        <Select<SkillCode | ''>
          value={skill}
          onChange={setSkill}
          aria-label={t('glossary.filterSkill')}
          data-testid="glossary-skill"
          popupMatchSelectWidth={false}
          options={[
            { value: '', label: t('glossary.allSkills') },
            ...SKILL_CODES.map((code) => ({
              value: code,
              label: t(`skills.${code}.name`),
            })),
          ]}
        />
      </div>

      <p
        className={styles.count}
        aria-live="polite"
        data-testid="glossary-count"
      >
        {t('glossary.count', { count: shown.length })}
      </p>

      {groups.length === 0 ? (
        <EmptyState description={t('glossary.empty')} />
      ) : (
        <>
          <nav aria-label={t('glossary.letters')} className={styles.letters}>
            {groups.map((group) => (
              <Link
                key={group.letter}
                to={{ hash: `letter-${group.letter}` }}
                className={styles.letter}
              >
                {group.letter}
              </Link>
            ))}
          </nav>

          {groups.map((group) => (
            <section
              key={group.letter}
              id={`letter-${group.letter}`}
              className={styles.group}
              aria-labelledby={`letter-${group.letter}-title`}
            >
              <h2
                id={`letter-${group.letter}-title`}
                className={styles.groupTitle}
              >
                {group.letter}
              </h2>
              {group.terms.map((term) => (
                <TermEntry
                  key={term.id}
                  term={term}
                  related={term.related.flatMap(
                    (slug) => bySlug.get(slug) ?? [],
                  )}
                  lang={lang}
                  active={term.slug === target}
                />
              ))}
            </section>
          ))}
        </>
      )}
    </>
  );
}

function TermEntry({
  term,
  related,
  lang,
  active,
}: {
  term: GlossaryTerm;
  related: GlossaryTerm[];
  lang: 'en' | 'vi';
  active: boolean;
}) {
  const { t } = useTranslation();

  return (
    <article
      id={term.slug}
      className={styles.term}
      data-testid="glossary-term"
      data-term={term.slug}
      data-active={active || undefined}
      aria-current={active || undefined}
    >
      <h3 className={styles.termName}>
        <span className={styles.termText}>{term.term}</span>
        {lang === 'vi' && term.viName && (
          <span className={styles.viName} lang="vi">
            {term.viName}
          </span>
        )}
      </h3>
      <p className={styles.definition}>
        {splitCode(definition(term, lang)).map((part, index) =>
          index % 2 === 1 ? <code key={index}>{part}</code> : part,
        )}
      </p>
      <div className={styles.meta}>
        <span>{t(`skills.${term.skill}.name`)}</span>
        {related.length > 0 && (
          <span className={styles.related}>
            {t('glossary.related')}
            {related.map((item) => (
              <Link key={item.id} to={glossaryHref(item.slug)}>
                {item.term}
              </Link>
            ))}
          </span>
        )}
      </div>
    </article>
  );
}
