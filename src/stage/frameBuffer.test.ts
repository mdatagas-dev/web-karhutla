import { describe, expect, it } from 'vitest';
import { FrameBuffer, type DecodedFrame, type FrameRequest } from './frameBuffer';

interface Fake {
  readonly index: number;
  readonly sequence: string;
}

function makeBuffer(
  overrides: Partial<{
    sequences: Record<string, number>;
    concurrency: number;
    capacity: number;
    lookAhead: number;
    lookBehind: number;
    abandonDistance: number;
    maxAttempts: number;
  }> = {},
) {
  const requests: FrameRequest[] = [];
  const resolvers: Array<(frame: DecodedFrame<Fake>) => void> = [];
  const aborted: string[] = [];

  const buffer = new FrameBuffer<Fake>(
    {
      sequences: overrides.sequences ?? { opening: 360 },
      concurrency: overrides.concurrency ?? 4,
      capacity: overrides.capacity ?? 48,
      lookAhead: overrides.lookAhead ?? 24,
      lookBehind: overrides.lookBehind ?? 3,
      abandonDistance: overrides.abandonDistance ?? 6,
      maxAttempts: overrides.maxAttempts ?? 3,
      fetchFrame: (request, signal) => {
        requests.push(request);
        signal.addEventListener('abort', () => aborted.push(request.key));
        return new Promise<DecodedFrame<Fake>>((resolve, reject) => {
          resolvers.push((frame) => resolve(frame));
          signal.addEventListener('abort', () => reject(new Error('aborted')));
        });
      },
    },
    '1280',
  );

  return { buffer, requests, resolvers, aborted };
}

const resolveWith = (resolvers: Array<(f: DecodedFrame<Fake>) => void>, index: number) => {
  const resolve = resolvers.shift();
  resolve?.({ payload: { index, sequence: 'opening' }, index, sequence: 'opening' });
};

describe('FrameBuffer', () => {
  it('wants the playhead first, then forward, then a short tail behind', () => {
    const { buffer } = makeBuffer();
    buffer.setTarget('opening', 100, 1);
    const wanted = buffer.wantedIndices();
    expect(wanted[0]).toBe(100);
    expect(wanted[1]).toBe(101);
    expect(wanted[2]).toBe(102);
    expect(wanted).toContain(99);
    expect(wanted).toContain(97);
    expect(wanted).not.toContain(96);
  });

  it('biases the window in the direction of travel', () => {
    const { buffer } = makeBuffer();
    buffer.setTarget('opening', 100, -1);
    const wanted = buffer.wantedIndices();
    expect(wanted[1]).toBe(99);
    expect(wanted[2]).toBe(98);
    expect(wanted).toContain(101);
  });

  it('clamps the playhead to the sequence', () => {
    const { buffer } = makeBuffer();
    buffer.setTarget('opening', 9999, 1);
    expect(buffer.wantedIndices()[0]).toBe(359);
    buffer.setTarget('opening', -50, 1);
    expect(buffer.wantedIndices()[0]).toBe(0);
  });

  it('never asks for more requests than the concurrency allows', () => {
    const { buffer, requests } = makeBuffer({ concurrency: 4 });
    buffer.setTarget('opening', 100, 1);
    buffer.tick();
    expect(requests).toHaveLength(4);
  });

  it('does not abort a request that is still close to the playhead', () => {
    const { buffer, requests, aborted } = makeBuffer({ abandonDistance: 6 });
    buffer.setTarget('opening', 100, 1);
    buffer.tick();
    // the playhead moves by one frame
    buffer.setTarget('opening', 101, 1);
    buffer.tick();
    expect(aborted).toHaveLength(0);
    expect(requests.length).toBeGreaterThanOrEqual(4);
  });

  it('aborts a request that drifted far away from the playhead', () => {
    const { buffer, aborted } = makeBuffer({ abandonDistance: 6 });
    buffer.setTarget('opening', 100, 1);
    buffer.tick();
    buffer.setTarget('opening', 300, 1);
    buffer.tick();
    expect(aborted.length).toBeGreaterThan(0);
  });

  it('caches a decoded frame and returns it as the closest match', async () => {
    const { buffer, resolvers } = makeBuffer();
    buffer.setTarget('opening', 100, 1);
    buffer.tick();
    resolveWith(resolvers, 100);
    await Promise.resolve();
    await Promise.resolve();
    const frame = buffer.closest('opening', 100);
    expect(frame?.index).toBe(100);
  });

  it('returns the closest cached frame when the exact one is missing', async () => {
    const { buffer, resolvers } = makeBuffer();
    buffer.setTarget('opening', 100, 1);
    buffer.tick();
    resolveWith(resolvers, 100);
    await Promise.resolve();
    await Promise.resolve();
    const frame = buffer.closest('opening', 103);
    expect(frame?.index).toBe(100);
  });

  it('returns null when nothing of that sequence is cached', () => {
    const { buffer } = makeBuffer();
    buffer.setTarget('opening', 100, 1);
    buffer.tick();
    expect(buffer.closest('opening', 100)).toBeNull();
    expect(buffer.closest('ending', 100)).toBeNull();
  });

  it('retries a failed frame up to the attempt limit', async () => {
    const attempts: string[] = [];
    const attemptsFor = (key: string): number =>
      attempts.filter((entry) => entry === key).length;
    let clock = 0;
    const timers: Array<() => void> = [];
    const buffer = new FrameBuffer<Fake>(
      {
        sequences: { opening: 360 },
        concurrency: 1,
        maxAttempts: 2,
        retryDelayMs: 10,
        now: () => clock,
        setTimeout: (handler) => {
          timers.push(handler);
          return timers.length;
        },
        clearTimeout: () => undefined,
        fetchFrame: (request) => {
          attempts.push(request.key);
          return Promise.reject(new Error('boom'));
        },
      },
      '1280',
    );

    buffer.setTarget('opening', 100, 1);
    buffer.tick();
    await Promise.resolve();
    await Promise.resolve();
    expect(attemptsFor('opening/1280/0100')).toBe(1);

    // the retry timer fires
    clock = 1000;
    timers.shift()?.();
    buffer.tick();
    await Promise.resolve();
    await Promise.resolve();
    expect(attemptsFor('opening/1280/0100')).toBe(2);

    // no further attempt: the frame is given up on
    buffer.tick();
    await Promise.resolve();
    await Promise.resolve();
    expect(attemptsFor('opening/1280/0100')).toBe(2);
    expect(buffer.stats().failed).toBeGreaterThanOrEqual(1);
  });

  it('evicts the frames that are farthest from the playhead first', async () => {
    const { buffer, resolvers } = makeBuffer({ capacity: 4, concurrency: 8 });
    buffer.setTarget('opening', 100, 1);
    buffer.tick();
    for (const index of [100, 101, 102, 103, 104, 105]) {
      resolveWith(resolvers, index);
      await Promise.resolve();
      await Promise.resolve();
      buffer.tick();
    }
    expect(buffer.stats().cached).toBeLessThanOrEqual(4);
    // the frame under the playhead survives
    expect(buffer.closest('opening', 100)).not.toBeNull();
  });

  it('releases evicted payloads', async () => {
    const evicted: Fake[] = [];
    const buffer = new FrameBuffer<Fake>(
      {
        sequences: { opening: 360 },
        capacity: 1,
        concurrency: 4,
        onEvict: (payload) => evicted.push(payload),
        fetchFrame: (request) =>
          Promise.resolve({
            payload: { index: request.index, sequence: request.sequence },
            index: request.index,
            sequence: request.sequence,
          }),
      },
      '1280',
    );
    buffer.setTarget('opening', 10, 1);
    buffer.tick();
    await Promise.resolve();
    await Promise.resolve();
    buffer.setTarget('opening', 200, 1);
    buffer.tick();
    await Promise.resolve();
    await Promise.resolve();
    expect(evicted.length).toBeGreaterThan(0);
  });

  it('drops everything when the tier changes, because the URLs change', async () => {
    const { buffer } = makeBuffer();
    buffer.setTarget('opening', 100, 1);
    buffer.tick();
    expect(buffer.stats().pending).toBe(4);
    buffer.setTier('768');
    expect(buffer.stats().pending).toBe(0);
    expect(buffer.stats().cached).toBe(0);
  });

  it('warms up the next sequence at low priority', () => {
    const { buffer, requests } = makeBuffer({ concurrency: 8, lookAhead: 4 });
    buffer.setTarget('opening', 100, 1);
    buffer.setWarmup([
      { sequence: 'ending', tier: '1280', index: 0, key: 'ending/1280/0000' },
    ]);
    buffer.tick();
    // the playhead requests come first
    expect(requests[0].sequence).toBe('opening');
    expect(requests.at(-1)?.sequence).toBe('ending');
  });

  it('keeps the warm-up alive across ticks', () => {
    // Regression: the warm-up belongs to the next sequence, so its distance from
    // the playhead is infinite. Treating that as "too far" aborted every
    // warm-up request on the next tick, so the next scene was never warmed.
    const { buffer, requests, aborted } = makeBuffer({ concurrency: 8, lookAhead: 4 });
    buffer.setTarget('opening', 100, 1);
    buffer.setWarmup([
      { sequence: 'ending', tier: '1280', index: 0, key: 'ending/1280/0000' },
      { sequence: 'ending', tier: '1280', index: 1, key: 'ending/1280/0001' },
    ]);

    for (let i = 0; i < 10; i++) buffer.tick();

    expect(aborted).toHaveLength(0);
    expect(requests.filter((request) => request.sequence === 'ending').length).toBe(2);
    expect(buffer.stats().pending).toBeGreaterThan(0);
  });

  it('abandons a warm-up that is no longer wanted', () => {
    const { buffer, aborted } = makeBuffer({ concurrency: 8, lookAhead: 4 });
    buffer.setTarget('opening', 100, 1);
    buffer.setWarmup([
      { sequence: 'ending', tier: '1280', index: 0, key: 'ending/1280/0000' },
    ]);
    buffer.tick();
    buffer.setWarmup([]);
    buffer.tick();
    expect(aborted.length).toBeGreaterThan(0);
  });

  it('reports how much it has delivered', async () => {
    const { buffer, resolvers } = makeBuffer();
    buffer.setTarget('opening', 100, 1);
    buffer.tick();
    resolveWith(resolvers, 100);
    await Promise.resolve();
    await Promise.resolve();
    expect(buffer.stats().delivered).toBe(1);
  });

  it('stops working after dispose', async () => {
    const { buffer, requests, resolvers } = makeBuffer();
    buffer.setTarget('opening', 100, 1);
    buffer.tick();
    buffer.dispose();
    expect(buffer.stats().pending).toBe(0);
    const before = requests.length;
    buffer.tick();
    expect(requests).toHaveLength(before);
    void resolvers;
  });
});
