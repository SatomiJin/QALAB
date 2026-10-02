import { useCallback, useEffect, useRef } from 'react';

/**
 * For a horizontally scrolling row (tabs): marks the element with
 * `data-more-start` / `data-more-end` while items are hidden on that side, so
 * CSS can fade the edge (`@include scroll-row`), and scrolls the current item
 * (`aria-current`) into view. Returns the ref callback for the row.
 */
export function useScrollEdges<T extends HTMLElement>(): (
  node: T | null,
) => void {
  const cleanup = useRef<(() => void) | null>(null);

  const ref = useCallback((node: T | null) => {
    cleanup.current?.();
    cleanup.current = null;
    if (!node) return;

    const update = () => {
      // 1px slack: scroll positions are fractional on zoomed screens.
      const more = node.scrollWidth - node.clientWidth > 1;
      node.toggleAttribute('data-more-start', more && node.scrollLeft > 1);
      node.toggleAttribute(
        'data-more-end',
        more && node.scrollLeft + node.clientWidth < node.scrollWidth - 1,
      );
    };

    const current = node.querySelector<HTMLElement>('[aria-current]');
    if (current) {
      const row = node.getBoundingClientRect();
      const item = current.getBoundingClientRect();
      if (item.left < row.left || item.right > row.right) {
        node.scrollLeft +=
          item.left - row.left - row.width / 2 + item.width / 2;
      }
    }

    update();
    node.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(node);
    // The content can grow without the row changing size (web font loaded).
    for (const child of node.children) observer.observe(child);
    cleanup.current = () => {
      node.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, []);

  useEffect(() => () => cleanup.current?.(), []);

  return ref;
}
