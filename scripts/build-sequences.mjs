#!/usr/bin/env node
/**
 * Generate `src/content/sequences.generated.ts` from `scripts/frames.json`.
 *
 * The frame counts and the frame rate are the contract between the build script
 * and the runtime: they must not be written down twice.
 *
 *   node scripts/build-sequences.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const spec = JSON.parse(await readFile(path.join(ROOT, 'scripts/frames.json'), 'utf8'));

const entries = Object.entries(spec.sequences);
const output = `/**
 * The published frame sequences.
 *
 * Generated from \`scripts/frames.json\`; run \`npm run sequences:build\` after
 * changing it. This is the contract between the asset pipeline and the runtime:
 * the frame rate and the frame counts exist in exactly one place.
 */

/** Frames per second of the source clips. */
export const FPS = ${spec.fps};

/** Published frame count per sequence. */
export const SEQUENCE_FRAMES: Record<string, number> = {
${entries.map(([name, count]) => `  '${name}': ${count},`).join('\n')}
};

/** The sequence names, in the order they are published. */
export const SEQUENCE_NAMES = [
${entries.map(([name]) => `  '${name}',`).join('\n')}
] as const;
`;

await writeFile(path.join(ROOT, 'src/content/sequences.generated.ts'), output);
console.log(`sequences.generated.ts written — ${entries.length} sequences @ ${spec.fps} fps`);
