# CLEARED — Context

CLEARED is an illustrated, scroll-scrubbed satire about forest fires in
Kalimantan, in Indonesian and English. It is a single page, a single story, and
a single technical idea: the film is a **frame sequence**, not a video.

This file is the shared vocabulary for the project. The technical rationale lives
in [docs/architecture.md](docs/architecture.md); the accepted requirements live
in [docs/spec.md](docs/spec.md).

## The domain language

| term | meaning |
|---|---|
| **hero** | one of three illustrated antagonists (`signature`, `handshake`, `puppeteer`); chosen at random unless `?hero=` pins it |
| **scene** | one of the nine scroll sections: `top`, `bridge`, six chapters, `act` |
| **chapter** | a scroll section with a caption window and a still illustration |
| **clip** | a slice of a frame sequence: which sequence, which time, which frames |
| **sequence** | a published run of frames (`opening`, `ending`, `<hero>-bridge`) |
| **tier** | a width-limited rendition of every frame (`1280`, `960`, `640`) |
| **playhead** | the frame the scroll position currently points at |
| **journey** | the scroll position expressed as a scene plus a progress value |
| **ink wipe** | the polygon transition that covers the seams between scenes |
| **reading mode** | the static document that replaces the film under reduced motion |

## The invariants

These hold everywhere, and the tests guard them:

1. **The frame rate is 24 fps** and the frame counts live in exactly one place
   (`scripts/frames.json`, generated into `src/content/sequences.generated.ts`).
2. **A frame index is always inside its clip.** The three chapters of the
   opening share one sequence, so a frame outside a chapter's range belongs to
   its neighbour.
3. **The canvas paints the closest available frame.** A slow connection produces
   a choppy film, never a frozen one.
4. **Reduced motion removes the film from the DOM**, it does not merely hide it.
5. **The story is `inert` while the menu is open**, so it leaves the
   accessibility tree entirely.
6. **Chapter text is announced once.** The illustrations are decorative; the
   caption carries the text.

## Decisions

Recorded in [docs/adr](docs/adr/). The short version:

- a frame sequence, not a video (0001)
- three rendition tiers, chosen by viewport (0002)
- a forward-biased prefetch window, and eviction by distance (0003)
- the source media stays a build input and is not served (0004)
