import { Tooltip } from 'antd';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { GlossaryTerm } from '../../types/api';
import { useContentLanguage } from '../learning/queries';
import { definition } from './glossary';
import { glossaryHref } from './link-terms';
import styles from './Glossary.module.scss';

interface GlossaryLinkProps {
  term: GlossaryTerm;
  children: ReactNode;
}

/** A term in lesson text: dotted underline, definition on hover, opens the glossary entry. */
export function GlossaryLink({ term, children }: GlossaryLinkProps) {
  const lang = useContentLanguage();
  return (
    <Tooltip
      title={
        <>
          <strong>{term.term}</strong>
          <br />
          {definition(term, lang)}
        </>
      }
      mouseEnterDelay={0.3}
    >
      <Link
        to={glossaryHref(term.slug)}
        className={styles.termLink}
        data-glossary-term={term.slug}
      >
        {children}
      </Link>
    </Tooltip>
  );
}
