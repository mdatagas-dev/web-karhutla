import { useCallback } from 'react';
import { useLingui } from '@lingui/react';
import type { MessageKey } from './catalog';

/**
 * Typed translation hook.
 *
 * The key is checked against the Indonesian catalog at compile time, so a typo
 * is a build error instead of a blank line at runtime.
 *
 * The returned function is stable: `i18n._` reads the active locale at call
 * time, so the value is always current. Components still re-render on a locale
 * change because `useLingui` subscribes to the i18n change event.
 */
export function useT(): (key: MessageKey) => string {
  const { i18n } = useLingui();
  return useCallback((key: MessageKey) => i18n._(key), [i18n]);
}
