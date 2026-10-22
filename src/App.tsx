import { useEffect, useMemo, useState } from 'react';
import { I18nProvider, useLingui } from '@lingui/react';
import { i18n } from './i18n/i18n';
import { useT } from './i18n/translate';
import { useJourney } from './hooks/useJourney';
import { useReducedMotion } from './hooks/useReducedMotion';
import {
  CHAPTERS,
  HEROES,
  HERO_IDS,
  heroKey,
  type HeroId,
} from './content/scenes';
import { Stage } from './stage/Stage';
import { mediaUrl } from './stage/tiers';
import { ChapterSection } from './ui/ChapterSection';
import { Closing } from './ui/Closing';
import { Header } from './ui/Header';
import { MenuDialog } from './ui/MenuDialog';

function pickHero(): HeroId {
  const requested = new URLSearchParams(window.location.search)
    .get('hero')
    ?.toLowerCase();
  if (requested && (HERO_IDS as readonly string[]).includes(requested)) {
    return requested as HeroId;
  }
  return HERO_IDS[Math.floor(Math.random() * HERO_IDS.length)];
}

function Story() {
  const { i18n } = useLingui();
  const locale = i18n.locale;
  const t = useT();
  const journey = useJourney();
  const reading = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const hero = useMemo(() => HEROES[pickHero()], []);

  // The document metadata follows the language.
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t('meta.title');
    document
      .querySelector('meta[name=description]')
      ?.setAttribute('content', t('meta.description'));
    document
      .querySelector('meta[property="og:title"]')
      ?.setAttribute('content', t('meta.title'));
    document
      .querySelector('meta[property="og:description"]')
      ?.setAttribute('content', t('meta.description'));
  }, [locale, t]);

  const isAct = journey.scene === 'act';
  const storyHref = reading ? '#first-cut' : '#bridge';
  const heroName = t(heroKey(hero.id, 'name'));
  const heroLine = t(heroKey(hero.id, 'line'));

  return (
    <div
      className={[
        'site',
        reading ? 'reading-mode' : '',
        menuOpen ? 'menu-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <a href="#story" className="skip-link">
        {t('nav.skip')}
      </a>

      {reading ? null : (
        <Stage journey={journey} hero={hero} paused={menuOpen} />
      )}

      <div className="guide guide-left" aria-hidden="true" />
      <div className="guide guide-right" aria-hidden="true" />

      <Header menuOpen={menuOpen} onOpenMenu={() => setMenuOpen(true)} />

      <main id="story" inert={menuOpen}>
        <section id="top" data-chapter className="intro">
          <img
            className="reading-image"
            src={mediaUrl(hero.poster)}
            alt={t('alt.hero')}
          />
          <div className="intro-copy">
            <p className="eyebrow">
              <span className="status-dot" aria-hidden="true" />
              {t('hero.eyebrow')}
            </p>
            <h1>
              {t('hero.line1')}
              <br />
              <em>{t('hero.line2')}</em>
            </h1>
            <p className="intro-deck">{t('hero.deck')}</p>
          </div>
          <div className="intro-bottom">
            <span className="scroll-hint">
              {t('hero.scroll')}
              <span aria-hidden="true">↓</span>
            </span>
          </div>
        </section>

        <section
          id="bridge"
          data-chapter
          className="bridge-section"
          aria-label={`${heroName}: ${t('hero.follow')}`}
        >
          <p className="sr-only">{heroLine}</p>
        </section>

        {CHAPTERS.map((chapter) => (
          <ChapterSection
            key={chapter.id}
            chapter={chapter}
            progress={journey.scene === chapter.id ? journey.progress : 0}
            active={journey.scene === chapter.id}
            reading={reading}
          />
        ))}

        <Closing visible={reading || isAct} />
      </main>

      <MenuDialog
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        storyHref={storyHref}
      />
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider i18n={i18n}>
      <Story />
    </I18nProvider>
  );
}
