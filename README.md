# CLEARED

A scroll-scrubbed illustrated satire about forest fires in Kalimantan.
Indonesian and English. No motion for readers who ask for none.

> "Berkas beres. Hutan habis." — *Paperwork done. Forest gone.*

The film is not a video. It is a **frame sequence**: every frame of the source
clips is published as a WebP, and the scroll position picks the frame. That is
what makes the scrub exact, what lets the frames be cached forever at the edge,
and what makes the whole thing work without buffering a single video segment.

## Run it

```bash
npm install
npm run assets:fetch     # download the source media (once)
npm run assets:frames    # extract + encode the frame sequences (once)
npm run dev              # http://localhost:5173
```

`assets:fetch` pulls the source clips and stills into `assets-src/` and
`public/media/`; `assets:frames` turns them into `public/frames/v2/`. Both
directories are git-ignored: the media is derived, not authored here.

| command | what it does |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | type check + production build into `dist/` |
| `npm run preview` | serve the production build |
| `npm test` | unit tests (Vitest) |
| `npm run lint` | oxlint |
| `npm run i18n:build` | regenerate `src/i18n/catalog.ts` from `scripts/i18n/*.json` |
| `npm run assets:fetch` | download the source media |
| `npm run assets:frames` | build the frame sequences and re-encode the idle loops |
| `npm run sequences:build` | regenerate the frame counts shared with the asset pipeline |
| `npm run measure` | measure this build against a reference build on a throttled network |

## Query parameters

| parameter | effect |
|---|---|
| `?hero=signature\|handshake\|puppeteer` | pin the hero variant instead of picking one at random |
| `?lang=id\|en` | force a language; the choice is remembered in `localStorage` |

## Layout

```
src/
  content/scenes.ts     the narrative model: heroes, chapters, clip table, easing
  content/sequences.generated.ts  frame rate and frame counts (from scripts/frames.json)
  stage/
    frameBuffer.ts      the buffer: prefetch window, eviction, retry, warm-up
    FrameSequence.tsx   canvas renderer + network plumbing
    Stage.tsx           scene composition (film, landscape, ink wipe, shade)
    IdleFilm.tsx        the ambient loop behind the hero
    resolveScene.ts     scene -> clip, with the fallbacks for the intro/footer
    tiers.ts            the rendition ladder and the frame URLs
  hooks/useJourney.ts   scroll position -> scene + progress
  hooks/useReducedMotion.ts
  i18n/                 catalogs, locale detection, typed `t()`
  ui/                   header, menu dialog, chapters, closing
scripts/                asset pipeline and catalog generation
```

## The frame pipeline in one paragraph

The scroll position gives a **playhead**: a sequence name and a frame index.
The playhead moves forward-biased — the next 24 frames are wanted before the 3
frames behind — because a reader almost always scrolls the same way. Frames are
fetched with up to 8 requests in flight, decoded with `createImageBitmap` and
kept in an LRU-ish cache of 48 bitmaps. A request is only abandoned when it
drifts more than 6 frames away from the playhead, and frames are evicted by
distance rather than by membership of the wanted set. The canvas always paints
the **closest available** frame, so a slow connection degrades into a choppy
film instead of a frozen one. A quarter of the request budget is reserved for
the next scene, so the seam between two chapters is already warm.

See [docs/architecture.md](docs/architecture.md) for the measurements and the
reasoning behind each number.

## Accessibility

- `prefers-reduced-motion: reduce` switches the whole page to a static
  document: the film is removed from the DOM, the stills are shown instead and
  every caption is visible.
- The menu is a native `<dialog>`, so focus trapping and `Escape` come from the
  platform. While it is open the story is `inert`, which removes it from the
  accessibility tree entirely.
- Chapter illustrations are decorative: the caption carries the text, so a
  screen reader never announces it twice.
- The palette clears WCAG AA with room to spare (body text 16.7:1, accent
  14.8:1, muted text 9.7:1).
- `forced-colors` mode drops the film and keeps the document.

## Licence

The satire, the illustrations and the copy are the author's own.
