import { captionAlpha, type Chapter } from '../content/scenes';
import { useT } from '../i18n/translate';
import { mediaUrl } from '../stage/tiers';

interface ChapterSectionProps {
  chapter: Chapter;
  /** Progress inside this chapter, 0..1. */
  progress: number;
  /** Whether this chapter is the one the reader is in. */
  active: boolean;
  /** Reduced motion turns the film into a document. */
  reading: boolean;
}

export function ChapterSection({
  chapter,
  progress,
  active,
  reading,
}: ChapterSectionProps) {
  const t = useT();
  const opacity = reading ? 1 : active ? captionAlpha(progress, chapter.caption) : 0;

  return (
    <section
      id={chapter.id}
      data-chapter
      className="chapter"
      style={{ '--chapter-height': `${chapter.height}svh` } as React.CSSProperties}
      aria-labelledby={`title-${chapter.id}`}
    >
      {/*
        The illustration is decorative: the caption below carries the full text.
        Repeating the text as `alt` would make a screen reader announce the
        paragraph twice.
      */}
      <img
        className="reading-image"
        src={mediaUrl(chapter.poster)}
        alt=""
        loading="lazy"
        decoding="async"
      />
      <div className="chapter-pin">
        <div className="chapter-copy" style={{ opacity }}>
          <h2 id={`title-${chapter.id}`}>
            <span>{t(chapter.headingKey)}</span>
          </h2>
          <p className={reading ? 'chapter-deck' : 'sr-only'}>
            {t(chapter.textKey)}
          </p>
        </div>
      </div>
    </section>
  );
}
