import { describe, expect, it } from 'vitest';
import { CATALOGS, EN, ID, LOCALES } from './catalog';

describe('catalogs', () => {
  it('has the same keys in every locale', () => {
    const idKeys = Object.keys(ID).sort();
    for (const locale of LOCALES) {
      expect(Object.keys(CATALOGS[locale]).sort(), locale).toEqual(idKeys);
    }
  });

  it('has no empty messages', () => {
    for (const locale of LOCALES) {
      for (const [key, [value]] of Object.entries(CATALOGS[locale])) {
        expect(value.trim(), `${locale}.${key}`).not.toBe('');
      }
    }
  });

  it('keeps every message free of ICU syntax', () => {
    for (const locale of LOCALES) {
      for (const [key, [value]] of Object.entries(CATALOGS[locale])) {
        expect(value, `${locale}.${key}`).not.toMatch(/[{}]/);
      }
    }
  });

  it('uses the compiled message format, so Lingui does not warn', () => {
    for (const locale of LOCALES) {
      for (const [key, message] of Object.entries(CATALOGS[locale])) {
        expect(Array.isArray(message), `${locale}.${key}`).toBe(true);
        expect(message.length, `${locale}.${key}`).toBe(1);
      }
    }
  });

  it('keeps the English catalog in sync with the Indonesian one', () => {
    expect(Object.keys(EN).sort()).toEqual(Object.keys(ID).sort());
  });
});
