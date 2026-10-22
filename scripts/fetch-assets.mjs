#!/usr/bin/env node
/**
 * Download the source media for the CLEARED experience from the live origin.
 *
 * Sources land in `assets-src/` (gitignored) and are the input for
 * `scripts/build-frames.mjs`. Runtime assets are written to `public/media/`.
 *
 *   node scripts/fetch-assets.mjs [--origin https://cleared.nonom.xyz]
 */
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import path from 'node:path';

const ORIGIN = argValue('--origin') ?? 'https://cleared.nonom.xyz';
const ROOT = path.resolve(import.meta.dirname, '..');
const SRC_DIR = path.join(ROOT, 'assets-src');
const PUBLIC_MEDIA = path.join(ROOT, 'public', 'media');

/** Source videos: input for frame extraction. */
const SOURCE_VIDEOS = [
  'signature-bridge.mp4',
  'handshake-bridge.mp4',
  'puppeteer-bridge.mp4',
  'opening.mp4',
  'ending.mp4',
  'signature-idle.mp4',
  'handshake-idle.mp4',
  'puppeteer-idle.mp4',
];

/** Still artwork: served as-is to the browser. */
const MEDIA_IMAGES = [
  'signature.webp',
  'handshake.webp',
  'puppeteer.webp',
  'bridge-signature.webp',
  'bridge-handshake.webp',
  'bridge-puppeteer.webp',
  'first-cut.webp',
  'the-clearing.webp',
  'the-ignition.webp',
  'landscape.webp',
  'foreground.webp',
  'the-air-between-us.webp',
  'the-record.webp',
  'accountability.webp',
];

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { 'user-agent': 'cleared-assets/2' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  await mkdir(path.dirname(dest), { recursive: true });
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  const { size } = await stat(dest);
  return size;
}

const manifest = { origin: ORIGIN, fetchedAt: new Date().toISOString(), files: [] };

for (const name of SOURCE_VIDEOS) {
  const dest = path.join(SRC_DIR, name);
  if (await exists(dest)) {
    console.log(`· skip  ${name} (already present)`);
    continue;
  }
  const size = await download(`${ORIGIN}/media/${name}`, dest);
  console.log(`✓ src  ${name}  ${(size / 1024 / 1024).toFixed(2)} MB`);
  manifest.files.push({ name, kind: 'source', bytes: size });
}

for (const name of MEDIA_IMAGES) {
  const dest = path.join(PUBLIC_MEDIA, name);
  if (await exists(dest)) {
    console.log(`· skip  media/${name}`);
    continue;
  }
  const size = await download(`${ORIGIN}/media/${name}`, dest);
  console.log(`✓ media ${name}  ${(size / 1024).toFixed(0)} KB`);
  manifest.files.push({ name, kind: 'media', bytes: size });
}

await writeFile(path.join(SRC_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\ndone — ${manifest.files.length} file(s) downloaded into assets-src/ + public/media/`);
