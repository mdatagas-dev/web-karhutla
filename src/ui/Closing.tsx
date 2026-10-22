import { useT } from '../i18n/translate';
import { mediaUrl } from '../stage/tiers';

interface ClosingProps {
  visible: boolean;
}

export function Closing({ visible }: ClosingProps) {
  const t = useT();

  return (
    <footer
      id="act"
      data-chapter
      className={visible ? 'closing is-visible' : 'closing'}
    >
      <img
        className="reading-image"
        src={mediaUrl('accountability.webp')}
        alt={t('alt.accountability')}
        loading="lazy"
        decoding="async"
      />
      <div className="closing-copy">
        <p className="eyebrow">{t('footer.eyebrow')}</p>
        <h2>
          <em>{t('footer.line2')}</em>
        </h2>
        <p>{t('footer.body')}</p>
      </div>
      <div className="colophon">
        <a href="#top">CLEARED.</a>
        <span className="design-credit">{t('footer.credit')}</span>
      </div>
    </footer>
  );
}
