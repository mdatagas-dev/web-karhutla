import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  focusX,
  frameFor,
  inkCoverage,
  landscapePan,
  type Hero,
} from '../content/scenes';
import { useT } from '../i18n/translate';
import type { Journey } from '../hooks/useJourney';
import { FrameSequence } from './FrameSequence';
import { IdleFilm } from './IdleFilm';
import { downgradeTier, mediaUrl, pickTier, type Tier } from './tiers';
import { resolveScene } from './resolveScene';

interface StageProps {
  journey: Journey;
  hero: Hero;
  /** The menu is open: the film is paused. */
  paused: boolean;
}

const STARVE_THRESHOLD = 14;
const STARVE_SAMPLES = 90;

export function Stage({ journey, hero, paused }: StageProps) {
  const t = useT();
  const { scene, progress, direction } = journey;
  const [tier, setTier] = useState<Tier>(() =>
    pickTier(window.innerWidth, window.devicePixelRatio),
  );
  const [mediaFailed, setMediaFailed] = useState(false);
  const starveCount = useRef(0);
  const downgraded = useRef(false);

  useEffect(() => {
    const onResize = (): void => {
      setTier((current) => {
        const wanted = pickTier(window.innerWidth, window.devicePixelRatio);
        return wanted.name === current.name ? current : wanted;
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const resolved = useMemo(
    () => resolveScene(scene, progress, hero),
    [scene, progress, hero],
  );

  /**
   * When the playhead outruns the buffer for a sustained period, the tier is
   * stepped down once. The frames are re-fetched at the smaller size, which is
   * cheaper than stuttering.
   */
  const onStarve = useCallback(
    (distance: number) => {
      // Never downgrade HD quality on desktop viewports
      if (typeof window !== 'undefined' && window.innerWidth >= 820) return;
      if (downgraded.current) return;
      if (distance > STARVE_THRESHOLD) {
        starveCount.current += 1;
        if (starveCount.current < STARVE_SAMPLES) return;
        starveCount.current = 0;
        const next = downgradeTier(tier);
        downgraded.current = true;
        if (next) setTier(next);
        return;
      }
      starveCount.current = 0;
    },
    [tier],
  );

  const focus = focusX(scene, progress, hero);
  const ink = inkCoverage(scene, progress);
  const pan = landscapePan(progress);
  const isLandscape = scene === 'beyond-the-boundary';
  const isClosing = scene === 'act';
  const isHero = scene === 'top';

  // The reveal at the start of "the air between us": the landscape is uncovered
  // from the top left corner.
  const reveal =
    scene === 'the-air-between-us' && progress < 0.08
      ? Math.min(1, progress / 0.08)
      : 1;

  const clipPath =
    reveal < 1
      ? `inset(${35 * (1 - reveal)}% ${6 * (1 - reveal)}% ${40 * (1 - reveal)}% ${76 * (1 - reveal)}%)`
      : undefined;

  const inkClip = `polygon(0 0, ${ink * 130}% 0, ${ink * 130 - 30}% 100%, 0 100%)`;

  return (
    <div
      className={[
        'stage',
        isHero ? 'stage-hero' : '',
        isLandscape ? 'stage-landscape' : '',
        isClosing ? 'stage-footer' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
      data-scene={scene}
      data-progress={progress.toFixed(4)}
      style={{ '--focus-x': `${focus}%` } as React.CSSProperties}
    >
      {isLandscape || (scene === 'the-air-between-us' && progress < 0.08) ? (
        <div
          className="landscape"
          style={{ '--pan': pan } as React.CSSProperties}
        >
          <img className="landscape-world" src={mediaUrl('landscape.webp')} alt="" />
          <img className="landscape-foreground" src={mediaUrl('foreground.webp')} alt="" />
        </div>
      ) : null}

      <div className="film-frame" style={clipPath ? { clipPath } : undefined}>
        <FrameSequence
          sequence={resolved.clip.sequence}
          index={frameFor(resolved.clip)}
          poster={resolved.clip.poster}
          visible={resolved.visible && !paused}
          direction={direction}
          tier={tier}
          nextSequence={resolved.clip.next}
          onStarve={onStarve}
        />
      </div>

      {isHero || (scene === 'bridge' && progress < 0.08) ? (
        <div
          className="idle-layer"
          style={{
            opacity: isHero ? 1 : 1 - Math.min(1, Math.max(0, progress / 0.08)),
          }}
        >
          <IdleFilm
            src={hero.idle}
            poster={hero.poster}
            active={isHero && !paused}
            onFailed={() => setMediaFailed(true)}
          />
        </div>
      ) : null}

      {isClosing ? (
        <img className="footer-art" src={mediaUrl('accountability.webp')} alt="" />
      ) : null}

      <div className="stage-shade" />

      {mediaFailed ? (
        <span className="media-notice" role="status">
          {t('media.failed')}
        </span>
      ) : null}

      <div className="ink-transition" style={{ clipPath: inkClip }} />
    </div>
  );
}
