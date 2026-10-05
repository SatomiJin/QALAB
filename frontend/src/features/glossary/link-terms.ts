import type { GlossaryTerm } from '../../types/api';

export const GLOSSARY_PATH = '/glossary';

export function glossaryHref(slug: string): string {
  return `${GLOSSARY_PATH}#${slug}`;
}

/** The term slug of a glossary link (`/glossary#test-case`), else `undefined`. */
export function glossarySlugFromHref(
  href: string | undefined,
): string | undefined {
  const prefix = `${GLOSSARY_PATH}#`;
  return href?.startsWith(prefix) ? href.slice(prefix.length) : undefined;
}

/** Minimal mdast node: just what the plugin reads and writes. */
export interface MdNode {
  type: string;
  value?: string;
  url?: string;
  children?: MdNode[];
}

interface Phrase {
  slug: string;
  text: string;
  /** All-caps acronyms (`CI`, `REST`) match only in capitals: "rest" is a word. */
  caseSensitive: boolean;
}

const key = (text: string) => text.toLowerCase().replace(/’/g, "'");

const escape = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&').replace(/'/g, "['’]");

// Text that is already a link, or a heading, is left alone. Code (`code`,
// `inlineCode`) is a leaf without text children, so it is never touched.
const SKIP = new Set(['link', 'linkReference', 'heading', 'definition']);

/**
 * Links glossary terms in Markdown to `/glossary#<slug>`: the first
 * occurrence of each term per text only, so a lesson is not a sea of links.
 * Same matching as the backend's usage count (`glossary-rules.ts`): whole
 * words (letters, digits, `_` and `-` are word characters, so "PageHeader"
 * and "non-functional" do not match "header" / "functional"), optional
 * plural, longest phrase first.
 */
export class TermLinker {
  readonly bySlug: ReadonlyMap<string, GlossaryTerm>;
  private readonly byPhrase: Map<string, Phrase>;
  private readonly pattern: RegExp | null;

  constructor(terms: readonly GlossaryTerm[]) {
    this.bySlug = new Map(terms.map((term) => [term.slug, term]));
    const phrases: Phrase[] = terms.flatMap((term) =>
      term.matchPhrases.map((text) => ({
        slug: term.slug,
        text,
        caseSensitive: /^[^a-z]*[A-Z][^a-z]*$/.test(text),
      })),
    );
    this.byPhrase = new Map(phrases.map((p) => [key(p.text), p]));
    this.pattern =
      phrases.length === 0
        ? null
        : new RegExp(
            `(?<![\\p{L}\\p{N}_-])(${[...phrases]
              .sort((a, b) => b.text.length - a.text.length)
              .map((p) => escape(p.text))
              .join('|')})(?:e?s)?(?![\\p{L}\\p{N}_-])`,
            'giu',
          );
  }

  private linkText(value: string, seen: Set<string>): MdNode[] {
    if (!this.pattern) return [{ type: 'text', value }];
    const out: MdNode[] = [];
    let last = 0;
    for (const found of value.matchAll(this.pattern)) {
      const phrase = this.byPhrase.get(key(found[1]));
      if (!phrase || seen.has(phrase.slug)) continue;
      if (phrase.caseSensitive && found[1] !== phrase.text) continue;
      seen.add(phrase.slug);
      const start = found.index;
      if (start > last) {
        out.push({ type: 'text', value: value.slice(last, start) });
      }
      out.push({
        type: 'link',
        url: glossaryHref(phrase.slug),
        children: [{ type: 'text', value: found[0] }],
      });
      last = start + found[0].length;
    }
    if (out.length === 0) return [{ type: 'text', value }];
    if (last < value.length) {
      out.push({ type: 'text', value: value.slice(last) });
    }
    return out;
  }

  private walk(node: MdNode, seen: Set<string>): void {
    if (!node.children || SKIP.has(node.type)) return;
    node.children = node.children.flatMap((child) => {
      if (child.type === 'text' && child.value) {
        return this.linkText(child.value, seen);
      }
      this.walk(child, seen);
      return [child];
    });
  }

  /** Rewrites the tree in place. */
  link(tree: MdNode): void {
    this.walk(tree, new Set());
  }
}

/** remark plugin for react-markdown: `[remarkGlossary, linker]`. */
export function remarkGlossary(linker: TermLinker) {
  return (tree: MdNode) => linker.link(tree);
}
