import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function currentPreference(): boolean {
  return window.matchMedia(QUERY).matches;
}

/**
 * Tracks the user's reduced-motion preference.
 *
 * When it is on, the film is replaced by a static reading layout, so this is a
 * first-class mode rather than a cosmetic tweak.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(currentPreference);

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const onChange = (): void => setReduced(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
