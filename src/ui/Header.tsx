import { useT } from '../i18n/translate';
import { LanguageSwitch } from './LanguageSwitch';

interface HeaderProps {
  menuOpen: boolean;
  onOpenMenu: () => void;
}

export function Header({ menuOpen, onOpenMenu }: HeaderProps) {
  const t = useT();

  return (
    <header className="site-header">
      <a className="wordmark" href="#top" aria-label={t('nav.home')}>
        <svg viewBox="0 0 28 34" aria-hidden="true">
          <path d="M23 3C8 3 2 11 4 21c2 9 13 11 18 3 4-7 1-14 1-21Z" />
          <path d="M6 32 22 5M12 20l-5-4m9-3 7 2" />
        </svg>
        <span>
          CLEARED
          <span className="wordmark-dot">.</span>
        </span>
      </a>
      <div className="header-right">
        <LanguageSwitch />
        <button
          type="button"
          className="menu-toggle"
          onClick={onOpenMenu}
          aria-label={t('nav.open')}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
