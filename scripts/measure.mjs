#!/usr/bin/env node
/**
 * Measure the experience against a reference build.
 *
 *   node scripts/measure.mjs --local http://127.0.0.1:5181/ \
 *                            --reference https://cleared.nonom.xyz/
 *
 * The network is throttled to a fixed profile so the two builds are comparable:
 * a localhost server has no latency, a CDN has plenty.
 *
 * Needs a Chromium binary. Set CHROMIUM_PATH, or let Playwright's own download
 * take care of it.
 */
import { chromium } from 'playwright-core';

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? dflt : argv[i + 1];
};

const LOCAL = flag('local', 'http://127.0.0.1:5181/');
const REFERENCE = flag('reference', 'https://cleared.nonom.xyz/');
const WIDTH = Number(flag('width', 1440));
const HEIGHT = Number(flag('height', 900));
const STEPS = Number(flag('steps', 40));
const DWELL = Number(flag('dwell', 350));

/** A decent but not generous connection. */
const THROTTLE = {
  offline: false,
  downloadThroughput: (12 * 1024 * 1024) / 8,
  uploadThroughput: (2 * 1024 * 1024) / 8,
  latency: 45,
};

async function measure(label, origin) {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    locale: 'id-ID',
    colorScheme: 'dark',
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', THROTTLE);

  const frames = { ok: 0, aborted: 0 };
  page.on('response', (response) => {
    if (response.url().includes('/frames/') && response.status() === 200) frames.ok += 1;
  });
  page.on('requestfailed', (request) => {
    if (request.url().includes('/frames/')) frames.aborted += 1;
  });

  await page.goto(origin, { waitUntil: 'load' });
  await page.waitForTimeout(3500);

  const initial = await page.evaluate(() => {
    const entries = performance.getEntriesByType('resource');
    return {
      transfer: entries.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
      paint: Math.round((performance.getEntriesByType('paint')[0] || {}).startTime || 0),
      heaviest: entries
        .map((entry) => ({
          name: entry.name.replace(/^https?:\/\/[^/]+/, ''),
          bytes: entry.transferSize,
        }))
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 4),
    };
  });

  const before = { ...frames };
  const samples = [];
  const started = Date.now();
  const scrollHeight = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );

  for (let step = 1; step <= STEPS; step += 1) {
    await page.evaluate(
      (y) => window.scrollTo(0, y),
      Math.round((scrollHeight - HEIGHT) * (step / STEPS)),
    );
    await page.waitForTimeout(DWELL);
    const sample = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.sequence-canvas');
      if (!canvas) return null;
      return {
        sequence: canvas.dataset.sequence ?? '',
        target: Number(canvas.dataset.targetFrame ?? 0),
        presented:
          canvas.dataset.presentedFrame === undefined
            ? -1
            : Number(canvas.dataset.presentedFrame),
      };
    });
    if (sample) samples.push(sample);
  }
  const seconds = (Date.now() - started) / 1000;

  // Let the buffer settle and see whether the film catches up with the reader.
  // The settle happens inside a chapter that actually shows the film: in the
  // intro and in the footer the canvas is hidden, so its read-out would say
  // nothing about the buffer.
  await page.evaluate(() => {
    const chapter = document.getElementById('the-record');
    if (!chapter) return;
    const top = chapter.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, Math.round(top + chapter.offsetHeight * 0.6));
  });
  await page.waitForTimeout(4000);
  const settled = await page.evaluate(() => {
    const canvas = document.querySelector('canvas.sequence-canvas');
    if (!canvas) return null;
    return {
      scene: document.querySelector('.stage')?.dataset.scene ?? '',
      target: Number(canvas.dataset.targetFrame ?? 0),
      presented:
        canvas.dataset.presentedFrame === undefined
          ? -1
          : Number(canvas.dataset.presentedFrame),
      cached: Number(canvas.dataset.cachedFrames ?? 0),
    };
  });

  const total = await page.evaluate(() => {
    const entries = performance.getEntriesByType('resource');
    return {
      transfer: entries.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
      requested: entries.filter((entry) => entry.name.includes('/frames/')).length,
    };
  });

  // Only compare samples inside one sequence: a scene change resets the
  // playhead, and comparing across it would be meaningless.
  const lag = [];
  for (let i = 1; i < samples.length; i += 1) {
    const a = samples[i - 1];
    const b = samples[i];
    if (a.sequence === b.sequence && a.presented >= 0 && b.presented >= 0) {
      lag.push(Math.abs(b.target - b.presented));
    }
  }
  lag.sort((a, b) => a - b);
  const percentile = (p) => (lag.length ? lag[Math.floor(lag.length * p)] : null);

  const ok = frames.ok - before.ok;
  const aborted = frames.aborted - before.aborted;
  const result = {
    label,
    initialKB: Math.round(initial.transfer / 1024),
    firstPaintMs: initial.paint,
    heaviest: initial.heaviest,
    journeyKB: Math.round(total.transfer / 1024),
    frameRequests: total.requested,
    framesOk: ok,
    framesAborted: aborted,
    abortRatePct:
      ok + aborted > 0 ? +((aborted / (ok + aborted)) * 100).toFixed(1) : 0,
    deliveredFps: seconds > 0 ? +(ok / seconds).toFixed(1) : 0,
    scrubLagFrames: { p50: percentile(0.5), p90: percentile(0.9), max: lag.at(-1) ?? null },
    settled,
  };
  await browser.close();
  return result;
}

const results = [];
if (REFERENCE) results.push(await measure('reference', REFERENCE));
results.push(await measure('local', LOCAL));
console.log(JSON.stringify(results, null, 2));
