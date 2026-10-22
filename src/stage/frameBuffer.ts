import { frameKey, type TierName } from './tiers';

/**
 * Frame buffer for the scroll-scrubbed film.
 *
 * This is the component that has to feel perfect: the playhead is driven by the
 * scroll position, and every frame has to arrive before the user reaches it.
 *
 * The model is a video player's buffer, not a symmetric cache:
 *
 *   - the playhead frame is fetched first,
 *   - then the frames *ahead* of it (the direction of travel),
 *   - then a short tail *behind* it,
 *   - requests that drift far away from the playhead are abandoned,
 *   - decoded frames are evicted by distance, never by "not in the wanted set",
 *     which is what made the previous implementation refetch the same frames
 *     over and over while scrolling.
 */

export interface FrameRequest {
  readonly sequence: string;
  readonly tier: TierName;
  readonly index: number;
  readonly key: string;
}

/** Decoded payload. Generic so the buffer can be unit tested without a DOM. */
export interface DecodedFrame<T> {
  readonly payload: T;
  readonly index: number;
  readonly sequence: string;
}

export interface FrameBufferOptions<T> {
  /** sequence name -> number of published frames */
  sequences: Record<string, number>;
  /** performs the network + decode work */
  fetchFrame: (request: FrameRequest, signal: AbortSignal) => Promise<DecodedFrame<T>>;
  /** max simultaneous requests */
  concurrency?: number;
  /** max decoded frames kept in memory */
  capacity?: number;
  /** frames prefetched ahead of the playhead */
  lookAhead?: number;
  /** frames kept behind the playhead */
  lookBehind?: number;
  /** a request further than this from the playhead is abandoned */
  abandonDistance?: number;
  /** attempts before a frame is given up on */
  maxAttempts?: number;
  /** base retry delay in ms */
  retryDelayMs?: number;
  /** injected clock, for tests */
  now?: () => number;
  /** injected timer, for tests */
  setTimeout?: (handler: () => void, timeout: number) => number;
  clearTimeout?: (handle: number) => void;
  /** called with every payload that leaves the cache, so it can be released */
  onEvict?: (payload: T) => void;
}

export interface FrameBufferStats {
  readonly cached: number;
  readonly pending: number;
  readonly failed: number;
  readonly delivered: number;
  readonly aborted: number;
  readonly bytes: number;
  /** The last error that was not an abort, for the diagnostic read-out. */
  readonly lastError: string | null;
}

const DEFAULTS = {
  concurrency: 8,
  capacity: 48,
  lookAhead: 24,
  lookBehind: 3,
  abandonDistance: 6,
  maxAttempts: 3,
  retryDelayMs: 900,
} as const;

interface PendingEntry {
  readonly key: string;
  readonly request: FrameRequest;
  readonly controller: AbortController;
}

export class FrameBuffer<T> {
  private readonly opts: Required<
    Pick<
      FrameBufferOptions<T>,
      | 'sequences'
      | 'fetchFrame'
      | 'concurrency'
      | 'capacity'
      | 'lookAhead'
      | 'lookBehind'
      | 'abandonDistance'
      | 'maxAttempts'
      | 'retryDelayMs'
    >
  > &
    FrameBufferOptions<T>;

  private readonly cache = new Map<string, DecodedFrame<T>>();
  private readonly pending = new Map<string, PendingEntry>();
  private readonly failures = new Map<string, { attempts: number; retryAt: number }>();
  private readonly givenUp = new Set<string>();
  private readonly retries = new Map<string, number>();

  private tier: TierName;
  private target: { sequence: string; index: number } | null = null;
  private direction: 1 | -1 = 1;
  private warmup: FrameRequest[] = [];
  private disposed = false;
  private bytes = 0;
  private delivered = 0;
  private aborted = 0;
  private lastError: string | null = null;

  private readonly now: () => number;
  private readonly setTimer: (handler: () => void, timeout: number) => number;
  private readonly clearTimer: (handle: number) => void;

  constructor(options: FrameBufferOptions<T>, initialTier: TierName) {
    this.opts = {
      concurrency: DEFAULTS.concurrency,
      capacity: DEFAULTS.capacity,
      lookAhead: DEFAULTS.lookAhead,
      lookBehind: DEFAULTS.lookBehind,
      abandonDistance: DEFAULTS.abandonDistance,
      maxAttempts: DEFAULTS.maxAttempts,
      retryDelayMs: DEFAULTS.retryDelayMs,
      ...options,
    };
    this.tier = initialTier;
    this.now = options.now ?? (() => Date.now());
    this.setTimer =
      options.setTimeout ?? ((handler, timeout) => setTimeout(handler, timeout) as unknown as number);
    this.clearTimer =
      options.clearTimeout ?? ((handle) => clearTimeout(handle as unknown as number));
  }

  /** Number of published frames for a sequence. */
  frameCount(sequence: string): number {
    return this.opts.sequences[sequence] ?? 0;
  }

  setTier(tier: TierName): void {
    if (tier === this.tier) return;
    this.tier = tier;
    // A different tier means different URLs: drop everything and start over.
    this.clearCache();
    this.abortAll();
    this.failures.clear();
    this.givenUp.clear();
  }

  /**
   * Move the playhead. `direction` is the direction of travel, used to bias the
   * prefetch towards where the viewer is going.
   */
  setTarget(sequence: string, index: number, direction: 1 | -1 = 1): void {
    const clamped = Math.max(0, Math.min(this.frameCount(sequence) - 1, Math.round(index)));
    if (this.target?.sequence === sequence && this.target.index === clamped) {
      this.direction = direction;
      return;
    }
    this.target = { sequence, index: clamped };
    this.direction = direction;
  }

  /** Sequence to warm up in the background (the next scene). */
  setWarmup(requests: FrameRequest[]): void {
    this.warmup = requests;
  }

  /** The ordered list of frame indices the buffer wants, nearest first. */
  wantedIndices(): number[] {
    if (!this.target) return [];
    const total = this.frameCount(this.target.sequence);
    if (total === 0) return [];
    const { index } = this.target;
    const dir = this.direction;
    const out: number[] = [index];
    for (let i = 1; i <= this.opts.lookAhead; i++) {
      const f = index + dir * i;
      if (f < 0 || f >= total) break;
      out.push(f);
    }
    for (let i = 1; i <= this.opts.lookBehind; i++) {
      const f = index - dir * i;
      if (f < 0 || f >= total) break;
      out.push(f);
    }
    return out;
  }

  private keyFor(sequence: string, index: number): string {
    return frameKey(sequence, this.tier, index);
  }

  private requestFor(sequence: string, index: number): FrameRequest {
    return { sequence, tier: this.tier, index, key: this.keyFor(sequence, index) };
  }

  /**
   * Issue the requests that are still missing, then evict what is no longer
   * useful. Safe to call on every animation frame.
   */
  tick(): void {
    if (this.disposed || !this.target) return;

    const wanted = this.wantedIndices();
    const wantedKeys = new Set(
      wanted.map((index) => this.keyFor(this.target!.sequence, index)),
    );

    this.abandonDistantRequests(wantedKeys);
    this.startRequests(wanted);
    this.startWarmup();
    this.trim();
  }

  /**
   * A request is only abandoned when it is both out of the wanted window and far
   * from the playhead. The previous implementation dropped every request that
   * left the window, which threw away ~10% of all traffic while scrolling.
   *
   * Warm-up requests belong to the *next* sequence, so their distance from the
   * playhead is infinite. Abandoning them on that basis would kill the warm-up
   * on the very next tick, which is exactly what happened in the first version
   * of this buffer.
   */
  private abandonDistantRequests(wantedKeys: Set<string>): void {
    if (!this.target) return;
    const { sequence, index } = this.target;
    const warmupKeys = new Set(this.warmup.map((request) => request.key));
    for (const [key, entry] of this.pending) {
      if (wantedKeys.has(key) || warmupKeys.has(key)) continue;
      const sameSequence = entry.request.sequence === sequence;
      const distance = sameSequence
        ? Math.abs(entry.request.index - index)
        : Number.POSITIVE_INFINITY;
      if (distance > this.opts.abandonDistance) {
        entry.controller.abort();
        this.pending.delete(key);
        this.aborted += 1;
      }
    }
  }

  private startRequests(wanted: number[]): void {
    if (!this.target) return;
    const sequence = this.target.sequence;
    const now = this.now();

    // A quarter of the request budget is reserved for the next scene, otherwise
    // the look-ahead window keeps the queue permanently full and the next scene
    // is never warmed up.
    const reserve = this.warmup.length
      ? Math.max(1, Math.floor(this.opts.concurrency / 4))
      : 0;
    const limit = Math.max(1, this.opts.concurrency - reserve);

    for (const index of wanted) {
      if (this.pending.size >= limit) break;
      const request = this.requestFor(sequence, index);
      if (
        this.cache.has(request.key) ||
        this.pending.has(request.key) ||
        this.retries.has(request.key)
      ) {
        continue;
      }
      const failure = this.failures.get(request.key);
      if (failure) {
        if (failure.attempts >= this.opts.maxAttempts) continue;
        if (failure.retryAt > now) continue;
      }
      this.dispatch(request);
    }
  }

  /** Low priority: the next scene's first frames, only when the main queue is idle. */
  private startWarmup(): void {
    if (this.pending.size >= this.opts.concurrency) return;
    for (const request of this.warmup) {
      if (this.pending.size >= this.opts.concurrency) break;
      if (this.cache.has(request.key) || this.pending.has(request.key)) continue;
      this.dispatch(request);
    }
  }

  private dispatch(request: FrameRequest): void {
    const controller = new AbortController();
    const entry: PendingEntry = { key: request.key, request, controller };
    this.pending.set(request.key, entry);

    this.opts
      .fetchFrame(request, controller.signal)
      .then((decoded) => {
        this.pending.delete(request.key);
        if (this.disposed || controller.signal.aborted) return;
        this.failures.delete(request.key);
        this.cache.set(request.key, decoded);
        this.delivered += 1;
        this.bytes += estimateBytes(decoded);
      })
      .catch((error: unknown) => {
        this.pending.delete(request.key);
        if (this.disposed || controller.signal.aborted) return;
        const previous = this.failures.get(request.key);
        this.lastError = `${request.key}: ${String(error)}`;
        const attempts = (previous?.attempts ?? 0) + 1;
        if (attempts >= this.opts.maxAttempts) {
          this.failures.set(request.key, { attempts, retryAt: Number.POSITIVE_INFINITY });
          this.givenUp.add(request.key);
          return;
        }
        const delay = this.opts.retryDelayMs * attempts;
        this.failures.set(request.key, { attempts, retryAt: this.now() + delay });
        const handle = this.setTimer(() => {
          this.retries.delete(request.key);
        }, delay);
        this.retries.set(request.key, handle);
        void error;
      });
  }

  /**
   * Evict by distance from the playhead.
   *
   * The previous implementation protected the whole look-ahead window, which is
   * larger than the cache itself, so nothing was ever evicted and every frame
   * had to be fetched again on the next pass. Distance is the only signal that
   * matters: the frame under the playhead is never dropped, everything else goes
   * first when it is the farthest away.
   */
  private trim(): void {
    if (this.cache.size <= this.opts.capacity) return;
    if (!this.target) return;

    const target = this.target;
    const entries = [...this.cache.entries()].map(([key, frame]) => {
      const sameSequence = frame.sequence === target.sequence;
      const distance = sameSequence
        ? Math.abs(frame.index - target.index)
        : Number.POSITIVE_INFINITY;
      return { key, frame, distance };
    });

    // farthest from the playhead first
    entries.sort((a, b) => b.distance - a.distance);

    let excess = this.cache.size - this.opts.capacity;
    for (const entry of entries) {
      if (excess <= 0) break;
      if (entry.distance === 0) continue;
      this.cache.delete(entry.key);
      this.opts.onEvict?.(entry.frame.payload);
      excess -= 1;
    }
  }

  /**
   * The cached frame closest to `index` inside `sequence`, preferring the exact
   * match. Returns null when nothing of that sequence is cached.
   */
  closest(sequence: string, index: number): DecodedFrame<T> | null {
    let best: DecodedFrame<T> | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const frame of this.cache.values()) {
      if (frame.sequence !== sequence) continue;
      const distance = Math.abs(frame.index - index);
      if (distance < bestDistance) {
        best = frame;
        bestDistance = distance;
        if (distance === 0) break;
      }
    }
    return best;
  }

  clearCache(): void {
    for (const frame of this.cache.values()) this.opts.onEvict?.(frame.payload);
    this.cache.clear();
  }

  abortAll(): void {
    for (const entry of this.pending.values()) entry.controller.abort();
    this.pending.clear();
  }

  stats(): FrameBufferStats {
    return {
      cached: this.cache.size,
      pending: this.pending.size,
      failed: this.givenUp.size,
      delivered: this.delivered,
      aborted: this.aborted,
      bytes: this.bytes,
      lastError: this.lastError,
    };
  }

  dispose(): void {
    this.disposed = true;
    this.abortAll();
    for (const handle of this.retries.values()) this.clearTimer(handle);
    this.retries.clear();
    this.clearCache();
    this.failures.clear();
    this.givenUp.clear();
  }
}

/** Rough decoded footprint of a frame, for the debug readout. */
export function estimateBytes<T>(frame: DecodedFrame<T>): number {
  const candidate = frame.payload as unknown as { width?: number; height?: number };
  if (typeof candidate?.width === 'number' && typeof candidate?.height === 'number') {
    return candidate.width * candidate.height * 4;
  }
  return 0;
}
