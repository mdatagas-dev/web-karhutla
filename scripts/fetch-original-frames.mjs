import fs from 'fs';
import path from 'path';

const ORIGIN = 'https://cleared.nonom.xyz';
const SEQUENCES = {
  'signature-bridge': 192,
  'handshake-bridge': 192,
  'puppeteer-bridge': 192,
  'opening': 360,
  'ending': 240,
};
const TIERS = ['1280', '768'];

const ROOT = path.resolve(import.meta.dirname, '..');
const FRAMES_DIR = path.join(ROOT, 'public', 'frames', 'v1');

async function downloadFrame(seq, tier, idx) {
  const padded = String(idx).padStart(4, '0');
  const relPath = `${seq}/${tier}/${padded}.webp`;
  const outPath = path.join(FRAMES_DIR, relPath);

  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
    return;
  }

  const url = `${ORIGIN}/frames/v1/${relPath}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, buf);
      return;
    } catch (err) {
      if (attempt === 4) throw err;
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
}

async function run() {
  const tasks = [];
  for (const [seq, count] of Object.entries(SEQUENCES)) {
    for (const tier of TIERS) {
      for (let i = 0; i < count; i++) {
        tasks.push({ seq, tier, idx: i });
      }
    }
  }

  console.log(`Total original frames to fetch: ${tasks.length}`);
  const CONCURRENCY = 40;
  let done = 0;
  let running = 0;
  let index = 0;

  return new Promise((resolve, reject) => {
    function pump() {
      while (running < CONCURRENCY && index < tasks.length) {
        const item = tasks[index++];
        running++;
        downloadFrame(item.seq, item.tier, item.idx)
          .then(() => {
            done++;
            if (done % 100 === 0 || done === tasks.length) {
              process.stdout.write(`\rProgress: ${done} / ${tasks.length} frames (${Math.round(done / tasks.length * 100)}%)`);
            }
          })
          .catch(err => {
            console.error(`\nFailed: ${item.seq}/${item.tier}/${item.idx}:`, err.message);
          })
          .finally(() => {
            running--;
            if (done === tasks.length) {
              console.log('\nAll original frames downloaded successfully!');
              resolve();
            } else {
              pump();
            }
          });
      }
    }
    pump();
  });
}

run().catch(console.error);
