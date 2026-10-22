import { describe, expect, it } from 'vitest';
import { downgradeTier, frameKey, frameUrl, mediaUrl, pickTier, TIERS } from './tiers';

describe('pickTier', () => {
  it('picks the smallest tier that covers the viewport', () => {
    expect(pickTier(390, 1.5).name).toBe('768');
    expect(pickTier(700, 1).name).toBe('768');
    expect(pickTier(1400, 1).name).toBe('1280');
  });

  it('never exceeds the largest tier', () => {
    expect(pickTier(4000, 3).name).toBe('1280');
  });

  it('ignores device pixel ratios above 1.5', () => {
    expect(pickTier(800, 1.5).name).toBe(pickTier(800, 3).name);
    expect(pickTier(800, 3).name).toBe('1280');
  });

  it('always returns a real tier', () => {
    for (const width of [320, 500, 768, 1024, 1440, 2560]) {
      expect(TIERS.some((tier) => tier.name === pickTier(width, 2).name)).toBe(true);
    }
  });
});

describe('tier ladder', () => {
  it('steps down, and never back up', () => {
    const top = TIERS.find((tier) => tier.name === '1280')!;
    const bottom = TIERS.find((tier) => tier.name === '768')!;
    expect(downgradeTier(top)?.name).toBe('768');
    expect(downgradeTier(bottom)).toBeNull();
  });
});

describe('frameUrl', () => {
  it('pads the index to four digits', () => {
    expect(frameUrl('opening', '1280', 0)).toBe('/frames/v1/opening/1280/0000.webp');
    expect(frameUrl('ending', '768', 239)).toBe('/frames/v1/ending/768/0239.webp');
  });

  it('uses the same key as the buffer', () => {
    expect(frameKey('opening', '1280', 7)).toBe('opening/1280/0007');
    expect(frameUrl('opening', '1280', 7)).toBe(`/frames/v1/${frameKey('opening', '1280', 7)}.webp`);
  });
});

describe('mediaUrl', () => {
  it('points at the media directory', () => {
    expect(mediaUrl('landscape.webp')).toBe('/media/landscape.webp');
  });
});
