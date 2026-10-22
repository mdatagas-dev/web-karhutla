import { clipForScene, type Clip, type Hero, type SceneId } from '../content/scenes';

export interface Resolved {
  clip: Clip;
  /** The film is on screen (as opposed to the landscape or the footer art). */
  visible: boolean;
}

/**
 * The scene -> clip mapping, including the fallbacks used for the scenes that are
 * not backed by a sequence of their own.
 *
 * The fallbacks double as a warm-up: while the reader is in the intro, the
 * bridge sequence is already being fetched, so the film starts without a hitch.
 */
export function resolveScene(scene: SceneId, progress: number, hero: Hero): Resolved {
  const direct = clipForScene(scene, progress, hero);
  if (direct) return { clip: direct, visible: true };
  if (scene === 'top') {
    return { clip: clipForScene('bridge', 0, hero)!, visible: false };
  }
  if (scene === 'act') {
    return { clip: clipForScene('the-record', 1, hero)!, visible: false };
  }
  return { clip: clipForScene('the-air-between-us', 0, hero)!, visible: false };
}
