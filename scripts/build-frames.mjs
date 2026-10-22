#!/usr/bin/env node
/**
 * Build the frame sequences and the compressed idle loops.
 *
 *   source mp4 ──ffmpeg──▶ 24 fps frames ──libwebp──▶ /frames/v2/<seq>/<tier>/<idx4>.webp
 *
 * Tiers are width-limited renditions of the *same* source frame, so the client can
 * pick the cheapest tier that still covers the viewport.
 *
 *   node scripts/build-frames.mjs [--jobs 8] [--quality 56] [--skip-existing]
 */
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';

const exec = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const SRC_DIR = path.join(ROOT, 'assets-src');
const FRAMES_DIR = path.join(ROOT, 'public', 'frames', 'v2');
const MEDIA_DIR = path.join(ROOT, 'public', 'media');

/**
 * Rendition ladder. `w` is the output width; the source is 1280x720 (16:9), so the
 * height follows. `q` is the libwebp quality for that tier.
 */
const TIERS = [
  { name: '1280', w: 1280, q: 56 },
  { name: '960', w: 960, q: 54 },
  { name: '640', w: 640, q: 50 },
];

/** source clip -> published sequence name */
const SEQUENCE_SOURCES = {
  'signature-bridge': 'signature-bridge.mp4',
  'handshake-bridge': 'handshake-bridge.mp4',
  'puppeteer-bridge': 'puppeteer-bridge.mp4',
  opening: 'opening.mp4',
  ending: 'ending.mp4',
};

/** idle loops are re-encoded: 960px, VP9 at CRF 34, no audio -> roughly a quarter of the source */
const IDLE_JOBS = [
  { src: 'signature-idle.mp4', out: 'signature-idle.mp4' },
  { src: 'handshake-idle.mp4', out: 'handshake-idle.mp4' },
  { src: 'puppeteer-idle.mp4', out: 'puppeteer-idle.mp4' },
];

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? dflt : argv[i + 1];
};
const JOBS = Number(flag('jobs', Math.min(8, os.cpus().length)));
const SKIP_EXISTING = argv.includes('--skip-existing');

// The frame rate and the frame counts are the contract with the runtime.
const spec = JSON.parse(
  await readFile(path.join(ROOT, 'scripts/frames.json'), 'utf8'),
);
const FPS = spec.fps;
const SEQUENCES = Object.entries(spec.sequences).map(([seq, frames]) => ({
  seq,
  frames,
  src: SEQUENCE_SOURCES[seq],
}));
for (const entry of SEQUENCES) {
  if (!entry.src) {
    throw new Error(`no source clip declared for the sequence "${entry.seq}"`);
  }
}

async function run(cmd, args) {
  try {
    await exec(cmd, args, { maxBuffer: 1024 * 1024 * 64 });
  } catch (err) {
    throw new Error(`${cmd} ${args.join(' ')}\n${err.stderr || err.message}`);
  }
}

/** Extract one sequence into a tier directory using a single ffmpeg pass. */
async function encodeSequence({ src, seq, frames }, tier) {
  const outDir = path.join(FRAMES_DIR, seq, tier.name);
  await mkdir(outDir, { recursive: true });

  if (SKIP_EXISTING) {
    const have = existsSync(outDir) ? (await readdir(outDir)).length : 0;
    if (have >= frames) {
      console.log(`· skip  ${seq}/${tier.name} (${have} frames)`);
      return 0;
    }
    await rm(outDir, { recursive: true, force: true });
  }

  // `-fps_mode passthrough` keeps 1:1 frame parity with the source timeline.
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', path.join(SRC_DIR, src),
    '-vf', `fps=${FPS},scale=${tier.w}:-2:flags=lanczos`,
    '-fps_mode', 'passthrough',
    '-c:v', 'libwebp',
    '-q:v', String(tier.q),
    '-compression_level', '4',
    '-preset', 'picture',
    '-frames:v', String(frames),
    // The image2 muxer numbers from 1 by default; the runtime addresses frames
    // from 0, so the numbering has to be pinned.
    '-start_number', '0',
    path.join(outDir, '%04d.webp'),
  ]);

  const produced = (await readdir(outDir)).filter((f) => f.endsWith('.webp')).sort();
  if (produced.length !== frames) {
    throw new Error(
      `${seq}/${tier.name}: expected ${frames} frames, produced ${produced.length}`,
    );
  }
  // The runtime addresses frames from 0; the image2 muxer numbers from 1.
  const first = produced[0];
  const last = produced[produced.length - 1];
  if (first !== '0000.webp' || last !== `${String(frames - 1).padStart(4, '0')}.webp`) {
    throw new Error(
      `${seq}/${tier.name}: frames must run 0000..${String(frames - 1).padStart(4, '0')}.webp, got ${first}..${last}`,
    );
  }
  return produced.length;
}

async function dirBytes(dir) {
  let total = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    total += entry.isDirectory() ? await dirBytes(p) : (await stat(p)).size;
  }
  return total;
}

/** Simple concurrency pool. */
async function pool(items, limit, worker) {
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
}

const t0 = Date.now();
console.log(`tiers: ${TIERS.map((t) => `${t.name}@q${t.q}`).join(', ')}  jobs: ${JOBS}\n`);

const jobs = [];
for (const seq of SEQUENCES) {
  for (const tier of TIERS) jobs.push({ ...seq, tier });
}

let done = 0;
await pool(jobs, JOBS, async (job) => {
  const n = await encodeSequence(job, job.tier);
  done++;
  console.log(`✓ ${String(done).padStart(2)}/${jobs.length} ${job.seq}/${job.tier.name}  ${n} frames`);
});

console.log('\nidle loops:');
for (const job of IDLE_JOBS) {
  const src = path.join(SRC_DIR, job.src);
  if (!existsSync(src)) {
    console.log(`· skip  ${job.out} (source missing)`);
    continue;
  }
  const dest = path.join(MEDIA_DIR, job.out);
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', src,
    '-an',
    '-vf', 'scale=960:-2:flags=lanczos',
    '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '34', '-row-mt', '1', '-cpu-used', '2',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    dest,
  ]);
  const { size } = await stat(dest);
  const { size: before } = await stat(src);
  console.log(`  ${job.out}  ${(before / 1024 / 1024).toFixed(2)} MB -> ${(size / 1024 / 1024).toFixed(2)} MB`);
}

const total = await dirBytes(FRAMES_DIR);
await writeFile(
  path.join(FRAMES_DIR, 'manifest.json'),
  JSON.stringify(
    {
      builtAt: new Date().toISOString(),
      fps: FPS,
      tiers: TIERS,
      sequences: Object.fromEntries(SEQUENCES.map((entry) => [entry.seq, entry.frames])),
    },
    null,
    2,
  ),
);
console.log(`\nframes total: ${(total / 1024 / 1024).toFixed(1)} MB  in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
