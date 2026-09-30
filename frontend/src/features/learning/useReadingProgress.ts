import { useEffect, useRef, type RefObject } from 'react';
import type { UpdateLessonProgressRequest } from '../../types/api';
import { progressToReport, readingPercent } from './progress';

interface ReadingProgressOptions {
  lessonId: string;
  /** Saved percentage when the lesson was loaded. */
  initialPercent: number;
  completed: boolean;
  articleRef: RefObject<HTMLElement | null>;
  record: (body: UpdateLessonProgressRequest) => void;
}

/**
 * Tells the backend that the lesson was opened, then how far it has been
 * read as the learner scrolls (in 10-point steps). Completed lessons only
 * record the visit. The backend keeps progress forward-only, so out-of-order
 * requests are harmless. Mount once per lesson (key the view by lesson id).
 */
export function useReadingProgress({
  lessonId,
  initialPercent,
  completed,
  articleRef,
  record,
}: ReadingProgressOptions): void {
  const openedId = useRef<string | null>(null);
  const reported = useRef(initialPercent);
  const recordRef = useRef(record);

  useEffect(() => {
    recordRef.current = record;
  });

  // One "opened" call per lesson (also guards StrictMode's double effect).
  useEffect(() => {
    if (openedId.current === lessonId) return;
    openedId.current = lessonId;
    recordRef.current({});
  }, [lessonId]);

  useEffect(() => {
    if (completed) return;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const article = articleRef.current;
      if (!article) return;
      const rect = article.getBoundingClientRect();
      const percent = readingPercent(rect.top, rect.height, window.innerHeight);
      const next = progressToReport(reported.current, percent);
      if (next !== null) {
        reported.current = next;
        recordRef.current({ progressPercent: next });
      }
    };
    const onScroll = () => {
      frame ||= requestAnimationFrame(measure);
    };

    // A short lesson may be fully visible without any scrolling.
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [lessonId, completed, articleRef]);
}
