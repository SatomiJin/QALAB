import { protectTerms } from './qa-glossary.js';

/**
 * Prepares English text for an HTML-mode machine translator and puts the
 * result back together.
 *
 * Markdown is not sent as-is: translators move or drop `**`, `|` and
 * backticks. Instead, block structure (headings, list markers, quotes,
 * table pipes, fenced code) stays out of the request, and each piece of
 * running text becomes a small HTML fragment:
 *
 * - `**bold**` → `<b>`, `*italic*` → `<i>`, `[text](url)` → `<a href="url">`
 * - inline code, URLs and QA glossary terms → `<span class="notranslate">`,
 *   which the translator returns unchanged.
 *
 * `assemble` turns the translated fragments back into Markdown. With an
 * identity translator the round trip returns the input unchanged.
 */
export interface PreparedText {
  /** HTML fragments to translate, in order. */
  pieces: string[];
  /** Rebuilds the text from the translated fragments (same order). */
  assemble(translated: string[]): string;
}

/** Bump when the pipeline changes, so cached translations are redone. */
export const PIPELINE_VERSION = 1;

const FENCE = /^\s*(```|~~~)/;
const TABLE_SEPARATOR = /^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*(:?-{3,}:?\s*)?\|?\s*$/;
const HR = /^\s*([-*_])(\s*\1){2,}\s*$/;
const BLOCK_PREFIX = /^(\s*(?:#{1,6}\s+|>\s?|[*+-]\s+|\d+[.)]\s+)*)([\s\S]*)$/;

const INLINE_TOKEN =
  /(`+)([\s\S]*?)\1|\[([^\]\n]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s<>()]+)/g;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Case-insensitive: translators do not always keep entity case.
const unescapeHtml = (value: string) =>
  value
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 16)),
    )
    .replace(/&amp;/gi, '&');

const keep = (raw: string) =>
  `<span class="notranslate">${escapeHtml(raw)}</span>`;

/** Plain text (no code or links) → HTML with emphasis and protected terms. */
function textToHtml(text: string): string {
  return protectTerms(
    escapeHtml(text),
    (term) => `<span class="notranslate">${term}</span>`,
  )
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^\w*])\*(?=[^\s*])([^*]*?[^\s*])\*(?![\w*])/g, '$1<i>$2</i>');
}

/** One piece of running text → an HTML fragment. */
export function inlineToHtml(text: string): string {
  let html = '';
  let last = 0;
  for (const match of text.matchAll(INLINE_TOKEN)) {
    html += textToHtml(text.slice(last, match.index));
    const [whole, , , linkText, linkUrl] = match;
    html +=
      linkText !== undefined
        ? `<a href="${escapeHtml(linkUrl)}">${textToHtml(linkText)}</a>`
        : keep(whole);
    last = match.index + whole.length;
  }
  return html + textToHtml(text.slice(last));
}

/** A translated HTML fragment → Markdown. */
export function htmlToInline(html: string): string {
  return unescapeHtml(
    html
      .replace(/<span class="notranslate">([\s\S]*?)<\/span>/g, '$1')
      .replace(
        /<a href="([^"]*)">\s*([\s\S]*?)\s*<\/a>/g,
        (_, url: string, label: string) => `[${label}](${url})`,
      )
      .replace(/<b>\s*([\s\S]*?)\s*<\/b>/g, '**$1**')
      .replace(/<i>\s*([\s\S]*?)\s*<\/i>/g, '*$1*'),
  );
}

type Token = string | { piece: number; lead: string; trail: string };

function prepare(tokens: Token[], pieces: string[]): PreparedText {
  return {
    pieces,
    assemble(translated) {
      return tokens
        .map((token) =>
          typeof token === 'string'
            ? token
            : token.lead + htmlToInline(translated[token.piece]) + token.trail,
        )
        .join('');
    },
  };
}

/** Adds `text` as a piece, keeping its surrounding whitespace verbatim. */
function pushText(tokens: Token[], pieces: string[], text: string): void {
  const core = text.trim();
  if (!core) {
    tokens.push(text);
    return;
  }
  const lead = text.slice(0, text.indexOf(core));
  const trail = text.slice(lead.length + core.length);
  tokens.push({ piece: pieces.length, lead, trail });
  pieces.push(inlineToHtml(core));
}

/** A title or description: one piece, no block structure. */
export function prepareInline(text: string): PreparedText {
  const tokens: Token[] = [];
  const pieces: string[] = [];
  pushText(tokens, pieces, text);
  return prepare(tokens, pieces);
}

/** A Markdown document: one piece per paragraph line or table cell. */
export function prepareMarkdown(markdown: string): PreparedText {
  const tokens: Token[] = [];
  const pieces: string[] = [];
  let inFence = false;

  markdown.split('\n').forEach((line, index) => {
    if (index > 0) tokens.push('\n');

    if (FENCE.test(line)) {
      inFence = !inFence;
      tokens.push(line);
      return;
    }
    if (
      inFence ||
      !line.trim() ||
      TABLE_SEPARATOR.test(line) ||
      HR.test(line)
    ) {
      tokens.push(line);
      return;
    }

    if (line.trimStart().startsWith('|')) {
      // Table row: translate each cell, keep the pipes where they are.
      line.split(/(?<!\\)\|/).forEach((cell, i) => {
        if (i > 0) tokens.push('|');
        pushText(tokens, pieces, cell);
      });
      return;
    }

    const [, prefix, rest] = BLOCK_PREFIX.exec(line)!;
    tokens.push(prefix);
    pushText(tokens, pieces, rest);
  });

  return prepare(tokens, pieces);
}
