import { describe, expect, it } from 'vitest';
import { HEROES } from '../content/scenes';
import { resolveScene } from './resolveScene';

const hero = HEROES.signature;

describe('resolveScene', () => {
  it('marks the film scenes as visible', () => {
    for (const scene of [
      'bridge',
      'first-cut',
      'the-clearing',
      'the-ignition',
      'the-air-between-us',
      'the-record',
    ] as const) {
      expect(resolveScene(scene, 0.5, hero).visible, scene).toBe(true);
    }
  });

  it('hides the film in the intro, the landscape and the footer', () => {
    for (const scene of ['top', 'beyond-the-boundary', 'act'] as const) {
      expect(resolveScene(scene, 0.5, hero).visible, scene).toBe(false);
    }
  });

  it('warms the bridge up while the reader is in the intro', () => {
    const { clip } = resolveScene('top', 0, hero);
    expect(clip.sequence).toBe('signature-bridge');
    expect(clip.first).toBe(0);
  });

  it('keeps the closing on the last frame of the ending', () => {
    const { clip } = resolveScene('act', 0, hero);
    expect(clip.sequence).toBe('ending');
    expect(clip.last).toBe(239);
  });

  it('hands the landscape chapter over to the ending sequence', () => {
    const { clip } = resolveScene('beyond-the-boundary', 0.5, hero);
    expect(clip.sequence).toBe('ending');
  });

  it('follows the hero variant for the bridge', () => {
    expect(resolveScene('bridge', 0, HEROES.handshake).clip.sequence).toBe(
      'handshake-bridge',
    );
    expect(resolveScene('bridge', 0, HEROES.puppeteer).clip.sequence).toBe(
      'puppeteer-bridge',
    );
  });
});
