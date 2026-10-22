#!/usr/bin/env node
/**
 * Generate `src/i18n/catalog.ts` from `scripts/i18n/{id,en}.json`.
 *
 *   node scripts/build-i18n.mjs
 *
 * The generated file types the English catalog against the Indonesian one, so a
 * missing key is a compile error instead of a blank line at runtime.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const id = JSON.parse(await readFile(path.join(ROOT, 'scripts/i18n/id.json'), 'utf8'));
const en = JSON.parse(await readFile(path.join(ROOT, 'scripts/i18n/en.json'), 'utf8'));

const missing = Object.keys(id).filter((key) => !(key in en));
const extra = Object.keys(en).filter((key) => !(key in id));
if (missing.length || extra.length) {
  console.error('catalog key mismatch');
  if (missing.length) console.error('  missing in en:', missing.join(', '));
  if (extra.length) console.error('  missing in id:', extra.join(', '));
  process.exit(1);
}

const template = (value) => '`' + String(value).replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`';
const key = (name) => `'${name.replace(/'/g, "\\'")}'`;
// The array form is Lingui's *compiled* message format: `[text]`. A plain
// string is treated as a raw ICU message and makes Lingui warn on every call.
const body = (catalog) =>
  Object.entries(catalog)
    .map(([name, value]) => `  ${key(name)}: [${template(value)}],`)
    .join('\n');

const output = `/**
 * Message catalogs.
 *
 * Generated from \`scripts/i18n/*.json\`; run \`npm run i18n:build\` after editing
 * them. The English catalog is typed against the Indonesian one, so a missing or
 * misspelled key is a compile error rather than a runtime blank.
 */

export const ID = {
${body(id)}
} as const;

export const EN: Record<keyof typeof ID, readonly [string]> = {
${body(en)}
};

export type MessageKey = keyof typeof ID;

export const LOCALES = ['id', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'id';

export const CATALOGS: Record<Locale, Record<MessageKey, readonly [string]>> = {
  id: ID,
  en: EN,
};
`;

await writeFile(path.join(ROOT, 'src/i18n/catalog.ts'), output);
console.log(`catalog.ts written — ${Object.keys(id).length} keys, id/en in sync`);
