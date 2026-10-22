import { describe, expect, it } from 'vitest';
import {
  CHAPTERS,
  HEROES,
  captionAlpha,
  clipForScene,
  clamp,
  focusX,
  heroKey,
  inkCoverage,
  landscapePan,
  smoothstep,
  windowProgress,
} from './scenes';

const hero = HEROES.signature;

describe('clipForScene', () => {
  it('maps every film backed scene onto a sequence', () => {
    for (const scene of [
      'bridge',
      'first-cut',
      'the-clearing',
      'the-ignition',
      'the-air-between-us',
      'the-record',
    ] as const) {
      const clip = clipForScene(scene, 0.5, hero);
      expect(clip, scene).not.toBeNull();
      expect(clip!.sequence).toBeTruthy();
      expect(clip!.last).toBeGreaterThanOrEqual(clip!.first);
    }
  });

  it('returns null for scenes that are not backed by a sequence', () => {
    expect(clipForScene('top', 0.5, hero)).toBeNull();
    expect(clipForScene('beyond-the-boundary', 0.5, hero)).toBeNull();
    expect(clipForScene('act', 0.5, hero)).toBeNull();
  });

  it('keeps the bridge inside its own sequence', () => {
    const clip = clipForScene('bridge', 1, hero)!;
    expect(clip.sequence).toBe('signature-bridge');
    expect(clip.first).toBe(0);
    expect(clip.last).toBe(191);
    expect(clip.next).toBe('opening');
  });

  it('splits the opening sequence across the three chapters', () => {
    const first = clipForScene('first-cut', 1, hero)!;
    const clearing = clipForScene('the-clearing', 1, hero)!;
    const ignition = clipForScene('the-ignition', 1, hero)!;
    expect(first.sequence).toBe('opening');
    expect(clearing.sequence).toBe('opening');
    expect(ignition.sequence).toBe('opening');
    expect(first.last).toBeLessThan(clearing.first);
    expect(clearing.last).toBeLessThan(ignition.first);
  });

  it('splits the ending sequence across the last two chapters', () => {
    const air = clipForScene('the-air-between-us', 1, hero)!;
    const record = clipForScene('the-record', 1, hero)!;
    expect(air.sequence).toBe('ending');
    expect(record.sequence).toBe('ending');
    expect(air.last).toBeLessThan(record.first);
  });

  it('maps the clip time onto the published frame range', () => {
    const clip = clipForScene('first-cut', 1, hero)!;
    const frame = Math.round(clip.time * 24);
    expect(frame).toBeGreaterThanOrEqual(clip.first);
    expect(frame).toBeLessThanOrEqual(clip.last);
  });
});

describe('easing helpers', () => {
  it('clamps', () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(2)).toBe(1);
    expect(clamp(0.5)).toBe(0.5);
  });

  it('smoothstep is 0 at the edges and 1 in the middle', () => {
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(1)).toBe(1);
    expect(smoothstep(0.5)).toBeCloseTo(0.5, 6);
    expect(smoothstep(-3)).toBe(0);
    expect(smoothstep(3)).toBe(1);
  });

  it('windowProgress leaves a dead zone at the start of a scene', () => {
    expect(windowProgress(0)).toBe(0);
    expect(windowProgress(0.04)).toBe(0);
    expect(windowProgress(0.08)).toBe(0);
    expect(windowProgress(0.9)).toBe(1);
    expect(windowProgress(1)).toBe(1);
  });

  it('landscapePan follows the window', () => {
    expect(landscapePan(0.5)).toBeCloseTo((0.5 - 0.08) / 0.82, 6);
  });
});

describe('captionAlpha', () => {
  const window: [number, number] = [0.5, 0.9];

  it('is transparent outside the caption window', () => {
    expect(captionAlpha(0.1, window)).toBe(0);
    expect(captionAlpha(0.45, window)).toBe(0);
  });

  it('is opaque in the middle of the window', () => {
    expect(captionAlpha(0.7, window)).toBe(1);
  });

  it('fades out at the end of the window', () => {
    expect(captionAlpha(0.95, window)).toBeLessThan(0.2);
  });

  it('never leaves the 0..1 range', () => {
    for (const p of [0, 0.25, 0.5, 0.75, 1]) {
      const alpha = captionAlpha(p, window);
      expect(alpha).toBeGreaterThanOrEqual(0);
      expect(alpha).toBeLessThanOrEqual(1);
    }
  });
});

describe('focusX', () => {
  it('uses the hero portrait at the top of the story', () => {
    expect(focusX('top', 0, hero)).toBe(hero.portrait);
  });

  it('interpolates the bridge from the hero portrait towards 61', () => {
    expect(focusX('bridge', 0, hero)).toBeCloseTo(hero.portrait, 6);
    expect(focusX('bridge', 1, hero)).toBeCloseTo(61, 6);
  });

  it('keeps every scene inside the frame', () => {
    for (const scene of [
      'top',
      'bridge',
      'first-cut',
      'the-clearing',
      'the-ignition',
      'beyond-the-boundary',
      'the-air-between-us',
      'the-record',
      'act',
    ] as const) {
      for (const p of [0, 0.25, 0.5, 0.75, 1]) {
        const value = focusX(scene, p, hero);
        expect(value, `${scene}@${p}`).toBeGreaterThanOrEqual(0);
        expect(value, `${scene}@${p}`).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('inkCoverage', () => {
  it('is transparent in the middle of a scene', () => {
    expect(inkCoverage('the-clearing', 0.5)).toBe(0);
  });

  it('covers the stage at the end of a scene that fades out', () => {
    expect(inkCoverage('first-cut', 0)).toBe(1);
  });

  it('covers the stage at the start of a scene that fades in', () => {
    expect(inkCoverage('bridge', 1)).toBe(1);
  });

  it('never leaves the 0..1 range', () => {
    for (const scene of ['first-cut', 'bridge', 'the-clearing', 'the-ignition'] as const) {
      for (const p of [0, 0.2, 0.5, 0.8, 1]) {
        const value = inkCoverage(scene, p);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('content model', () => {
  it('gives every chapter a unique id and a poster', () => {
    const ids = new Set(CHAPTERS.map((chapter) => chapter.id));
    expect(ids.size).toBe(CHAPTERS.length);
    for (const chapter of CHAPTERS) {
      expect(chapter.poster).toMatch(/\.webp$/);
      expect(chapter.height).toBeGreaterThan(0);
    }
  });

  it('keeps caption windows inside the chapter', () => {
    for (const chapter of CHAPTERS) {
      const [from, to] = chapter.caption;
      expect(from).toBeGreaterThanOrEqual(0);
      expect(to).toBeLessThanOrEqual(1);
      expect(to).toBeGreaterThan(from);
    }
  });

  it('exposes typed hero message keys', () => {
    expect(heroKey('signature', 'name')).toBe('hero.signature.name');
    expect(heroKey('puppeteer', 'line')).toBe('hero.puppeteer.line');
  });
});
