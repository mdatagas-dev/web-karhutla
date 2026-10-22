/**
 * The narrative model of CLEARED.
 *
 * Everything the runtime needs to know about the film lives here: the three hero
 * variants, the chapter list, and the clip table that maps a scene onto a slice of
 * a frame sequence.
 */
import type { MessageKey } from '../i18n/catalog';
import { FPS, SEQUENCE_FRAMES } from './sequences.generated';

export const HERO_IDS = ['signature', 'handshake', 'puppeteer'] as const;
export type HeroId = (typeof HERO_IDS)[number];

export interface Hero {
  readonly id: HeroId;
  /**
   * Horizontal position of the subject inside the 16:9 frame, in percent.
   * Used as `object-position` so the subject survives a portrait crop.
   */
  readonly portrait: number;
  readonly poster: string;
  readonly idle: string;
  readonly bridgeSequence: string;
  readonly bridgePoster: string;
}

export const HEROES: Record<HeroId, Hero> = {
  signature: {
    id: 'signature',
    portrait: 82,
    poster: 'signature.webp',
    idle: 'signature-idle.mp4',
    bridgeSequence: 'signature-bridge',
    bridgePoster: 'bridge-signature.webp',
  },
  handshake: {
    id: 'handshake',
    portrait: 50,
    poster: 'handshake.webp',
    idle: 'handshake-idle.mp4',
    bridgeSequence: 'handshake-bridge',
    bridgePoster: 'bridge-handshake.webp',
  },
  puppeteer: {
    id: 'puppeteer',
    portrait: 78,
    poster: 'puppeteer.webp',
    idle: 'puppeteer-idle.mp4',
    bridgeSequence: 'puppeteer-bridge',
    bridgePoster: 'bridge-puppeteer.webp',
  },
};

/**
 * The i18n key for one of the three hero variants.
 */
export function heroKey(id: HeroId, field: 'name' | 'line'): MessageKey {
  return `hero.${id}.${field}` as MessageKey;
}

export const CHAPTER_IDS = [
  'first-cut',
  'the-clearing',
  'the-ignition',
  'beyond-the-boundary',
  'the-air-between-us',
  'the-record',
] as const;
export type ChapterId = (typeof CHAPTER_IDS)[number];

export interface Chapter {
  readonly id: ChapterId;
  /** Scroll height of the chapter, in svh. */
  readonly height: number;
  readonly poster: string;
  /** Progress window in which the caption fades in and out. */
  readonly caption: readonly [number, number];
  /** Key into the i18n catalog. */
  readonly headingKey: MessageKey;
  readonly textKey: MessageKey;
}

export const CHAPTERS: readonly Chapter[] = [
  {
    id: 'first-cut',
    height: 220,
    poster: 'first-cut.webp',
    caption: [0.52, 0.88],
    headingKey: 'chapter.first-cut.heading',
    textKey: 'chapter.first-cut.text',
  },
  {
    id: 'the-clearing',
    height: 180,
    poster: 'the-clearing.webp',
    caption: [0.6, 0.94],
    headingKey: 'chapter.the-clearing.heading',
    textKey: 'chapter.the-clearing.text',
  },
  {
    id: 'the-ignition',
    height: 240,
    poster: 'the-ignition.webp',
    caption: [0.46, 0.82],
    headingKey: 'chapter.the-ignition.heading',
    textKey: 'chapter.the-ignition.text',
  },
  {
    id: 'beyond-the-boundary',
    height: 300,
    poster: 'landscape.webp',
    caption: [0.34, 0.74],
    headingKey: 'chapter.beyond-the-boundary.heading',
    textKey: 'chapter.beyond-the-boundary.text',
  },
  {
    id: 'the-air-between-us',
    height: 200,
    poster: 'the-air-between-us.webp',
    caption: [0.36, 0.86],
    headingKey: 'chapter.the-air-between-us.heading',
    textKey: 'chapter.the-air-between-us.text',
  },
  {
    id: 'the-record',
    height: 240,
    poster: 'the-record.webp',
    caption: [0.64, 0.94],
    headingKey: 'chapter.the-record.heading',
    textKey: 'chapter.the-record.text',
  },
];

/** Every id that participates in the scroll journey. */
export const SCENE_IDS = [
  'top',
  'bridge',
  ...CHAPTER_IDS,
  'act',
] as const;
export type SceneId = (typeof SCENE_IDS)[number];

/** A slice of a frame sequence. */
export interface Clip {
  readonly sequence: string;
  readonly poster: string;
  /** Seconds into the source clip. */
  readonly time: number;
  /** Inclusive first/last frame index inside `sequence`. */
  readonly first: number;
  readonly last: number;
  /** Sequence to warm up while this one plays. */
  readonly next: string | null;
}

/**
 * Time spans of the source clips, in seconds. The published frame index is always
 * `round(time * FPS)` clamped into the clip range, so these must stay in sync with
 * the extracted sequences.
 */
export const CLIP_TIME = {
  bridge: 8,
  firstCut: 5 - 1 / FPS,
  clearing: 4 - 1 / FPS,
  ignition: 6,
  airBetweenUs: 4 - 1 / FPS,
  record: 6,
} as const;

/**
 * Build the clip for a scene.
 *
 * `progress` is the 0..1 position inside the scene; `hero` selects the bridge
 * variant. Returns `null` for scenes that are not backed by a sequence.
 */
export function clipForScene(
  scene: SceneId,
  progress: number,
  hero: Hero,
): Clip | null {
  const r = windowProgress(progress);
  switch (scene) {
    case 'bridge':
      return {
        sequence: hero.bridgeSequence,
        poster: hero.bridgePoster,
        time: r * CLIP_TIME.bridge,
        first: 0,
        last: SEQUENCE_FRAMES[hero.bridgeSequence] - 1,
        next: 'opening',
      };
    case 'first-cut':
      return {
        sequence: 'opening',
        poster: 'first-cut.webp',
        time: r * CLIP_TIME.firstCut,
        first: 0,
        last: 119,
        next: null,
      };
    case 'the-clearing':
      return {
        sequence: 'opening',
        poster: 'the-clearing.webp',
        time: 5 + r * CLIP_TIME.clearing,
        first: 120,
        last: 215,
        next: null,
      };
    case 'the-ignition':
      return {
        sequence: 'opening',
        poster: 'the-ignition.webp',
        time: 9 + r * CLIP_TIME.ignition,
        first: 216,
        last: 359,
        next: 'ending',
      };
    case 'the-air-between-us':
      return {
        sequence: 'ending',
        poster: 'the-air-between-us.webp',
        time: r * CLIP_TIME.airBetweenUs,
        first: 0,
        last: 95,
        next: null,
      };
    case 'the-record':
      return {
        sequence: 'ending',
        poster: 'the-record.webp',
        time: 4 + r * CLIP_TIME.record,
        first: 96,
        last: 239,
        next: null,
      };
    default:
      return null;
  }
}

/**
 * The playhead inside a scene is remapped so that the first 8% of the scroll is a
 * dead zone and the remaining 82% maps onto the whole clip.
 */
export function windowProgress(progress: number): number {
  return clamp((progress - 0.08) / 0.82);
}

/**
 * The published frame index for a point in time.
 *
 * Clamped to the clip, not just to the sequence: the three chapters of the
 * opening share one sequence, and a frame outside a chapter's range belongs to
 * its neighbour.
 */
export function frameFor(clip: Clip): number {
  const total = SEQUENCE_FRAMES[clip.sequence] ?? 0;
  if (total === 0) return 0;
  const raw = Math.round(clip.time * FPS);
  return Math.max(clip.first, Math.min(clip.last, Math.min(total - 1, raw)));
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function smoothstep(t: number): number {
  const c = clamp(t);
  return c * c * (3 - 2 * c);
}

/**
 * Opacity of a chapter caption: fades in at `from`, holds, fades out at `to`.
 */
export function captionAlpha(
  progress: number,
  window: readonly [number, number],
): number {
  const [from, to] = window;
  return (
    smoothstep((progress - from) / 0.08) * (1 - smoothstep((progress - to + 0.08) / 0.08))
  );
}

/**
 * Horizontal focal point of the stage, in percent, per scene. Keeps the subject
 * in frame when the viewport is narrower than the film.
 */
export function focusX(scene: SceneId, progress: number, hero: Hero): number {
  const r = smoothstep(windowProgress(progress));
  switch (scene) {
    case 'top':
      return hero.portrait;
    case 'bridge':
      return hero.portrait + (61 - hero.portrait) * r;
    case 'first-cut':
      return 61 + 16 * r;
    case 'the-clearing':
      return 77 - 12 * r;
    case 'the-ignition':
      return 65;
    case 'the-air-between-us':
      return 28;
    case 'the-record':
      return 28 + 47 * r;
    case 'act':
      return 75;
    default:
      return 50;
  }
}

/**
 * The "ink" wipe that covers the seams between scenes. 0 = fully transparent,
 * 1 = the whole stage is covered.
 */
export function inkCoverage(scene: SceneId, progress: number): number {
  const fadingOut = ['first-cut', 'beyond-the-boundary'].includes(scene)
    ? 1 - smoothstep(progress / 0.07)
    : 0;
  const fadingIn = ['bridge', 'the-ignition'].includes(scene)
    ? smoothstep((progress - 0.94) / 0.06)
    : 0;
  return Math.max(fadingOut, fadingIn);
}

/** Parallax offset of the landscape layers, 0..1. */
export function landscapePan(progress: number): number {
  return windowProgress(progress);
}
