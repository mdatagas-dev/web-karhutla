import { useEffect, useRef } from 'react';
import { useT } from '../i18n/translate';

interface MenuDialogProps {
  open: boolean;
  onClose: () => void;
  /** Anchor for the "follow the line" entry, which differs per mode. */
  storyHref: string;
}

/**
 * The navigation dialog.
 *
 * It is a native `<dialog>`: focus trapping, `Escape` to close and the top layer
 * come from the platform instead of from a hand-rolled focus manager. The dialog
 * and the inner navigation carry different names so a screen reader does not
 * announce "Navigasi" twice.
 */
export function MenuDialog({ open, onClose, storyHref }: MenuDialogProps) {
  const t = useT();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousOverflow = document.documentElement.style.overflow;
    if (open) document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="site-menu"
      aria-label={t('nav.menu')}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="menu-heading">
        <a className="wordmark" href="#top" onClick={onClose}>
          CLEARED
          <span className="wordmark-dot">.</span>
        </a>
        <button type="button" onClick={onClose} aria-label={t('nav.close')}>
          {t('nav.close')} <span aria-hidden="true">×</span>
        </button>
      </div>
      <nav className="menu-links" aria-label={t('nav.links')}>
        <a href={storyHref} onClick={onClose}>
          {t('menu.story')}
        </a>
        <a href="#the-air-between-us" onClick={onClose}>
          {t('menu.cost')}
        </a>
        <a href="#act" onClick={onClose}>
          {t('menu.record')}
        </a>
      </nav>
    </dialog>
  );
}
