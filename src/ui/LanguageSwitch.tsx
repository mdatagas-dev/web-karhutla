import { useLingui } from '@lingui/react';
import { activateLocale, type Locale } from '../i18n/i18n';
import { useT } from '../i18n/translate';

export function LanguageSwitch() {
  const { i18n } = useLingui();
  const t = useT();
  const locale = (i18n.locale as Locale) ?? 'id';

  return (
    <div className="language-switch" role="group" aria-label={t('nav.language')}>
      <button
        type="button"
        lang="id"
        aria-pressed={locale === 'id'}
        onClick={() => activateLocale('id')}
      >
        ID
      </button>
      <span aria-hidden="true">/</span>
      <button
        type="button"
        lang="en"
        aria-pressed={locale === 'en'}
        onClick={() => activateLocale('en')}
      >
        EN
      </button>
    </div>
  );
}
