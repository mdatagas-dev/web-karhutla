import { useEffect, useRef, useState } from 'react';
import { mediaUrl } from './tiers';

interface IdleFilmProps {
  src: string;
  poster: string;
  /** Play only while the hero is on screen. */
  active: boolean;
  /** Called when the video cannot be played. */
  onFailed?: () => void;
}

/**
 * The ambient loop behind the hero.
 */
export function IdleFilm({ src, poster, active, onFailed }: IdleFilmProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updatePlay = (): void => {
      if (active && !document.hidden) {
        video.play().catch(() => setReady(false));
      } else {
        video.pause();
      }
    };

    updatePlay();
    document.addEventListener('visibilitychange', updatePlay);
    return () => {
      video.pause();
      document.removeEventListener('visibilitychange', updatePlay);
    };
  }, [active]);

  return (
    <div className="film" data-media={src} data-failed={failed}>
      <img className="film-poster" src={mediaUrl(poster)} alt="" />
      {!failed && (
        <video
          ref={videoRef}
          className={ready ? 'is-ready' : ''}
          src={mediaUrl(src)}
          muted
          playsInline
          loop
          preload="auto"
          disablePictureInPicture
          aria-hidden="true"
          onLoadedData={() => setReady(true)}
          onError={() => {
            setFailed(true);
            onFailed?.();
          }}
        />
      )}
    </div>
  );
}
