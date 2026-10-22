import { useEffect, useRef, useState } from 'react';
import type { SceneId } from '../content/scenes';

export interface Journey {
  /** The chapter the reader is currently inside. */
  scene: SceneId;
  /** 0..1 position inside the current scene. */
  progress: number;
  /** Direction of travel, used to bias frame prefetching. */
  direction: 1 | -1;
}

interface Anchor {
  id: string;
  top: number;
  height: number;
}

const INITIAL: Journey = {
  scene: 'top',
  progress: 0,
  direction: 1,
};

/**
 * Turns the scroll position into a scene + progress pair.
 *
 * The measurement is cached and only recomputed when the document actually
 * resizes, so scrolling never forces a layout read.
 */
export function useJourney(): Journey {
  const [journey, setJourney] = useState<Journey>(INITIAL);
  const anchorsRef = useRef<Anchor[]>([]);
  const frameRef = useRef(0);
  const lastScrollRef = useRef(0);

  useEffect(() => {
    const measure = (): Anchor[] => {
      const nodes = document.querySelectorAll<HTMLElement>('[data-chapter]');
      const anchors: Anchor[] = [];
      for (const node of nodes) {
        const rect = node.getBoundingClientRect();
        anchors.push({
          id: node.id,
          top: rect.top + window.scrollY,
          height: node.offsetHeight || 1,
        });
      }
      anchorsRef.current = anchors;
      return anchors;
    };

    const update = (): void => {
      frameRef.current = 0;
      const anchors = anchorsRef.current.length ? anchorsRef.current : measure();
      if (!anchors.length) return;

      const scrollY = Math.max(0, window.scrollY);
      const direction: 1 | -1 = scrollY >= lastScrollRef.current ? 1 : -1;
      lastScrollRef.current = scrollY;

      let current = anchors[0];
      for (const anchor of anchors) {
        if (scrollY + 1 >= anchor.top) current = anchor;
        else break;
      }

      const progress = Math.min(
        1,
        Math.max(0, (scrollY - current.top) / current.height),
      );
      setJourney((previous) => {
        if (
          previous.scene === current.id &&
          previous.progress === progress &&
          previous.direction === direction
        ) {
          return previous;
        }
        return { scene: current.id as SceneId, progress, direction };
      });
    };

    const schedule = (): void => {
      if (frameRef.current) return;
      frameRef.current = window.requestAnimationFrame(update);
    };

    const remeasure = (): void => {
      measure();
      update();
    };

    // A deep link such as /#act should land on the chapter, not on the intro.
    const hashTarget = document.getElementById(window.location.hash.slice(1));
    if (window.scrollY === 0 && hashTarget?.hasAttribute('data-chapter')) {
      hashTarget.scrollIntoView({ behavior: 'instant' });
    }

    measure();
    update();

    const observer = new ResizeObserver(remeasure);
    observer.observe(document.querySelector('main') ?? document.body);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', remeasure);
    window.addEventListener('pageshow', remeasure);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('pageshow', remeasure);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return journey;
}
