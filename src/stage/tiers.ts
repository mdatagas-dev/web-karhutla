/**
 * Frame rendition ladder and URL layout.
 *
 * The published frames live under `/frames/v2/<sequence>/<tier>/<index>.webp`.
 * A tier is a width-limited rendition of the *same* source frame, so the client
 * can pick the cheapest tier that still covers the viewport.
 */

export const TIERS = [
  { name: '1280', width: 1280, height: 720 },
  { name: '768', width: 768, height: 432 },
] as const;

export type TierName = (typeof TIERS)[number]['name'];

export interface Tier {
  readonly name: TierName;
  readonly width: number;
  readonly height: number;
}

export const FRAME_BASE = '/frames/v1';
export const MEDIA_BASE = '/media';

/**
 * Pick the cheapest tier that still covers the viewport.
 *
 * The film is cropped with `object-fit: cover`, so the binding constraint is the
 * viewport *width*; the device pixel ratio only matters up to 1.5 because beyond
 * that the extra pixels are invisible on a 16:9 illustration.
 */
export function pickTier(
  viewportWidth: number,
  devicePixelRatio: number,
  tiers: readonly Tier[] = TIERS,
): Tier {
  const sorted = [...tiers].sort((a, b) => a.width - b.width);
  const largest = sorted[sorted.length - 1];
  const needed = Math.min(
    largest.width,
    Math.ceil(viewportWidth * Math.min(Math.max(devicePixelRatio, 1), 1.5)),
  );
  for (const tier of sorted) {
    if (tier.width >= needed) return tier;
  }
  return largest;
}

/** The tier one step down, used when the buffer cannot keep up. */
export function downgradeTier(tier: Tier, tiers: readonly Tier[] = TIERS): Tier | null {
  const sorted = [...tiers].sort((a, b) => a.width - b.width);
  const index = sorted.findIndex((candidate) => candidate.name === tier.name);
  if (index <= 0) return null;
  return sorted[index - 1];
}

/** The cache key of a frame: `<sequence>/<tier>/<index>`. */
export function frameKey(sequence: string, tier: TierName, index: number): string {
  return `${sequence}/${tier}/${String(index).padStart(4, '0')}`;
}

export function frameUrl(sequence: string, tier: TierName, index: number): string {
  return `${FRAME_BASE}/${frameKey(sequence, tier, index)}.webp`;
}

export function mediaUrl(name: string): string {
  return `${MEDIA_BASE}/${name}`;
}
