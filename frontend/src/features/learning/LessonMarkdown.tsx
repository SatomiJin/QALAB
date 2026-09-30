import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './LessonMarkdown.module.scss';

// Raw HTML in lesson Markdown is not rendered (react-markdown's default), so
// content cannot inject scripts or markup.
const components: Components = {
  // The page title is the only h1; content headings start at h2.
  h1: ({ node: _node, ...props }) => <h2 {...props} />,
  a: ({ node: _node, href, ...props }) => {
    const external = href !== undefined && /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
        {...props}
      />
    );
  },
  // Wide tables scroll inside their own box, never the page.
  table: ({ node: _node, ...props }) => (
    <div className={styles.tableWrap}>
      <table {...props} />
    </div>
  ),
};

interface LessonMarkdownProps {
  source: string;
  testId?: string;
}

/** Markdown from the database (lessons, exercise questions and reviews). */
export function LessonMarkdown({
  source,
  testId = 'lesson-content',
}: LessonMarkdownProps) {
  return (
    <div className={styles.markdown} data-testid={testId}>
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </Markdown>
    </div>
  );
}
