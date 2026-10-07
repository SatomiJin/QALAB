import { useMemo } from 'react';
import Markdown, { type Components, type Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GlossaryLink } from '../glossary/GlossaryLink';
import {
  glossarySlugFromHref,
  remarkGlossary,
  TermLinker,
} from '../glossary/link-terms';
import { useGlossary } from '../glossary/queries';
import styles from './LessonMarkdown.module.scss';

// Raw HTML in lesson Markdown is not rendered (react-markdown's default), so
// content cannot inject scripts or markup.
function markdownComponents(linker: TermLinker | null): Components {
  return {
    // The page title is the only h1; content headings start at h2.
    h1: ({ node: _node, ...props }) => <h2 {...props} />,
    a: ({ node: _node, href, ...props }) => {
      const term = linker?.bySlug.get(glossarySlugFromHref(href) ?? '');
      if (term)
        return <GlossaryLink term={term}>{props.children}</GlossaryLink>;
      const external = href !== undefined && /^https?:\/\//.test(href);
      return (
        <a
          href={href}
          {...(external
            ? { target: '_blank', rel: 'noreferrer noopener' }
            : {})}
          {...props}
        />
      );
    },
    // Wide tables and code scroll inside their own box, never the page. The
    // box takes keyboard focus so it can be scrolled without a pointer.
    table: ({ node: _node, ...props }) => (
      <div className={styles.tableWrap} tabIndex={0}>
        <table {...props} />
      </div>
    ),
    pre: ({ node: _node, ...props }) => <pre tabIndex={0} {...props} />,
  };
}

type PluggableList = NonNullable<Options['remarkPlugins']>;

const COMPONENTS = markdownComponents(null);
const PLUGINS: PluggableList = [remarkGfm];

interface LessonMarkdownProps {
  source: string;
  testId?: string;
  /**
   * Link glossary terms to the glossary page. Only where leaving the page
   * loses nothing (lesson, admin preview); never next to a form being typed.
   */
  linkTerms?: boolean;
}

/** Markdown from the database (lessons, exercise questions and reviews). */
export function LessonMarkdown({
  source,
  testId = 'lesson-content',
  linkTerms = false,
}: LessonMarkdownProps) {
  // Terms load next to the lesson; until then (or if they fail) the text
  // simply has no links.
  const glossary = useGlossary({ enabled: linkTerms });
  const items = linkTerms ? glossary.data?.items : undefined;
  const { plugins, components } = useMemo(() => {
    if (!items?.length) return { plugins: PLUGINS, components: COMPONENTS };
    const linker = new TermLinker(items);
    return {
      plugins: [remarkGfm, [remarkGlossary, linker]] as PluggableList,
      components: markdownComponents(linker),
    };
  }, [items]);

  return (
    <div className={styles.markdown} data-testid={testId}>
      <Markdown remarkPlugins={plugins} components={components}>
        {source}
      </Markdown>
    </div>
  );
}
