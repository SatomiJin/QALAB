import { useEffect, useState, type RefObject } from 'react';
import { readingPercent, REPORT_STEP } from './progress';

/**
 * How far the article has been read right now, in REPORT_STEP points, for
 * what the page shows (side column, the phone action bar). Unlike the saved
 * progress it also goes down when the learner scrolls back up.
 */
export function useReadPercent(
  articleRef: RefObject<HTMLElement | null>,
): number {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const article = articleRef.current;
      if (!article) return;
      const rect = article.getBoundingClientRect();
      const read = readingPercent(rect.top, rect.height, window.innerHeight);
      // Re-render only when a step is crossed, not on every scroll frame.
      setPercent(Math.floor(read / REPORT_STEP) * REPORT_STEP);
    };
    const onScroll = () => {
      frame ||= requestAnimationFrame(measure);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [articleRef]);

  return percent;
}
