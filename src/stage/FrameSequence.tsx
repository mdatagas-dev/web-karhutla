import { useEffect, useLayoutEffect, useRef } from 'react';
import { SEQUENCE_FRAMES } from '../content/sequences.generated';
import { FrameBuffer, type FrameRequest } from './frameBuffer';
import { frameKey, frameUrl, mediaUrl, type Tier } from './tiers';

interface FrameSequenceProps {
  sequence: string;
  /** Absolute frame index inside `sequence`. */
  index: number;
  poster: string;
  /** Whether the film is actually on screen (it still prefetches when it is not). */
  visible: boolean;
  direction: 1 | -1;
  tier: Tier;
  /** Sequence to warm up in the background. */
  nextSequence: string | null;
  /** Reported when the buffer cannot keep up with the playhead. */
  onStarve?: (distance: number) => void;
}

async function decodeFrame(
  request: FrameRequest,
  signal: AbortSignal,
): Promise<{ payload: ImageBitmap; index: number; sequence: string }> {
  const response = await fetch(frameUrl(request.sequence, request.tier, request.index), {
    signal,
    cache: 'force-cache',
  });
  if (!response.ok) throw new Error(`frame HTTP ${response.status}`);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  return { payload: bitmap, index: request.index, sequence: request.sequence };
}

/** How often the debug read-out on the canvas is refreshed. */
const STATS_INTERVAL_MS = 120;

/**
 * Draws the film onto a canvas.
 *
 * The playhead comes from React state (the scroll position), the frames come from
 * the network. The component always paints the *closest available* frame, so a
 * slow connection degrades into a choppy film instead of a frozen one.
 */
export function FrameSequence({
  sequence,
  index,
  poster,
  visible,
  direction,
  tier,
  nextSequence,
  onStarve,
}: FrameSequenceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef<FrameBuffer<ImageBitmap> | null>(null);
  const drawnRef = useRef<ImageBitmap | null>(null);
  const targetRef = useRef({ sequence, index, direction });
  const visibleRef = useRef(visible);
  const tierRef = useRef(tier);
  const starveRef = useRef(onStarve);

  // The animation loop reads the playhead from a ref, because it must not be
  // restarted on every render. Layout effects run before the browser paints, so
  // the loop never draws a frame against a stale playhead.
  useLayoutEffect(() => {
    targetRef.current = { sequence, index, direction };
    visibleRef.current = visible;
    tierRef.current = tier;
    starveRef.current = onStarve;
  });

  // The buffer owns the network work; it survives re-renders.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    const buffer = new FrameBuffer<ImageBitmap>(
      {
        sequences: SEQUENCE_FRAMES,
        fetchFrame: decodeFrame,
        onEvict: (bitmap) => bitmap.close(),
      },
      tierRef.current.name,
    );
    bufferRef.current = buffer;

    let raf = 0;
    let statsAt = 0;
    let presented = -1;
    let currentSequence = targetRef.current.sequence;

    const loop = (): void => {
      raf = window.requestAnimationFrame(loop);
      const active = bufferRef.current;
      if (!active) return;

      active.tick();

      const target = targetRef.current;
      if (target.sequence !== currentSequence) {
        currentSequence = target.sequence;
      }

      const frame = active.closest(target.sequence, target.index);
      if (frame && visibleRef.current) {
        if (frame.payload !== drawnRef.current) {
          const started = performance.now();
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = 'high';
          context.drawImage(frame.payload, 0, 0, canvas.width, canvas.height);
          canvas.classList.add('is-ready');
          drawnRef.current = frame.payload;
          const drawMs = (performance.now() - started).toFixed(2);
          canvas.dataset.presentedFrame = String(frame.index);
          canvas.dataset.drawMs = drawMs;
          presented = frame.index;
        }
      }

      // The read-out is a diagnostic, not a hot path.
      const now = performance.now();
      if (now - statsAt < STATS_INTERVAL_MS && presented >= 0) return;
      statsAt = now;

      const stats = active.stats();
      canvas.dataset.targetFrame = String(target.index);
      canvas.dataset.sequence = target.sequence;
      canvas.dataset.cachedFrames = String(stats.cached);
      canvas.dataset.pendingFrames = String(stats.pending);
      canvas.dataset.failedFrames = String(stats.failed);
      canvas.dataset.abortedFrames = String(stats.aborted);
      canvas.dataset.decodedBytes = String(stats.bytes);
      canvas.dataset.tier = tierRef.current.name;
      if (stats.lastError) canvas.dataset.lastFrameError = stats.lastError;
      if (presented < 0) canvas.dataset.presentedFrame = '-1';
    };

    raf = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(raf);
      buffer.dispose();
      bufferRef.current = null;
      drawnRef.current = null;
    };
  }, []);

  // Move the playhead.
  useEffect(() => {
    bufferRef.current?.setTarget(sequence, index, direction);
  }, [sequence, index, direction]);

  // A different tier means different URLs: everything cached is useless.
  useEffect(() => {
    const buffer = bufferRef.current;
    if (!buffer) return;
    buffer.setTier(tier.name);
    drawnRef.current = null;
    const canvas = canvasRef.current;
    canvas?.classList.remove('is-ready');
    canvas?.removeAttribute('data-presented-frame');
  }, [tier.name]);

  // Keep the next scene warm.
  useEffect(() => {
    const buffer = bufferRef.current;
    if (!buffer) return;
    if (!nextSequence) {
      buffer.setWarmup([]);
      return;
    }
    const requests: FrameRequest[] = [];
    for (let i = 0; i < 8; i++) {
      requests.push({
        sequence: nextSequence,
        tier: tier.name,
        index: i,
        key: frameKey(nextSequence, tier.name, i),
      });
    }
    buffer.setWarmup(requests);
  }, [nextSequence, tier.name]);

  // Report starvation so the stage can step the tier down.
  useEffect(() => {
    const buffer = bufferRef.current;
    if (!buffer || !onStarve) return;
    const timer = window.setInterval(() => {
      const target = targetRef.current;
      const frame = buffer.closest(target.sequence, target.index);
      const distance = frame ? Math.abs(frame.index - target.index) : 999;
      starveRef.current?.(distance);
    }, 250);
    return () => window.clearInterval(timer);
  }, [onStarve]);

  return (
    <div className="film sequence" data-media={sequence} hidden={!visible}>
      <img className="film-poster" src={mediaUrl(poster)} alt="" />
      <canvas
        ref={canvasRef}
        className="sequence-canvas"
        aria-hidden="true"
        width={tier.width}
        height={tier.height}
      />
    </div>
  );
}
