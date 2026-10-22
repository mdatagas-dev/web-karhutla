/**
 * The published frame sequences.
 *
 * Generated from `scripts/frames.json`; run `npm run sequences:build` after
 * changing it. This is the contract between the asset pipeline and the runtime:
 * the frame rate and the frame counts exist in exactly one place.
 */

/** Frames per second of the source clips. */
export const FPS = 24;

/** Published frame count per sequence. */
export const SEQUENCE_FRAMES: Record<string, number> = {
  'signature-bridge': 192,
  'handshake-bridge': 192,
  'puppeteer-bridge': 192,
  'opening': 360,
  'ending': 240,
};

/** The sequence names, in the order they are published. */
export const SEQUENCE_NAMES = [
  'signature-bridge',
  'handshake-bridge',
  'puppeteer-bridge',
  'opening',
  'ending',
] as const;
