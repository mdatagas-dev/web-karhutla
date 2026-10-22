# Architecture

Why the film is a frame sequence, how the buffer works, and what each number in
the code is for.

The domain vocabulary lives in [../CONTEXT.md](../CONTEXT.md); the accepted
requirements live in [spec.md](spec.md); the decisions live in [adr](adr/).

## 1. The problem with video

A scroll-scrubbed film needs three things that ordinary video does not give
you:

1. **Exact scrubbing.** The frame has to match the scroll position, not the
   nearest keyframe.
2. **No buffering.** A reader who scrolls fast must not wait for a decoder.
3. **Cheap re-visits.** Scrolling back up must not re-download anything.

The published site solves this with a frame sequence: every frame of the source
clips is a WebP file, and the scroll position picks the index. Measured against
the live site, that design still failed on a real connection, because the
*buffer management* around the frames was wrong. This rebuild keeps the idea
and fixes the buffer.

## 2. The source material

The clips are 24 fps, 1280x720, H.264:

| clip | duration | frames | role |
|---|---|---|---|
| `signature-bridge.mp4` | 8.00 s | 192 | bridge, hero variant 1 |
| `handshake-bridge.mp4` | 8.00 s | 192 | bridge, hero variant 2 |
| `puppeteer-bridge.mp4` | 8.00 s | 192 | bridge, hero variant 3 |
| `opening.mp4` | 15.00 s | 360 | chapters 1-3 |
| `ending.mp4` | 10.00 s | 240 | chapters 5-6 |
| `*-idle.mp4` | 7.58 s | 182 | ambient loop behind the hero |

The bridge clip is not one clip but three: each hero variant has its own
opening shot.

The frame rate and the frame counts live in `scripts/frames.json` and are
generated into `src/content/sequences.generated.ts`. The asset pipeline and the
runtime read the same numbers.

## 3. The rendition ladder

Frames are published at three widths. Every tier is a rendition of the *same*
source frame, so the client can pick the cheapest one that still covers the
viewport.

| tier | width | libwebp quality | mean frame size |
|---|---|---|---|
| `1280` | 1280 px | 56 | ~38 KB |
| `960` | 960 px | 54 | ~25 KB |
| `640` | 640 px | 50 | ~14 KB |

URL layout: `/frames/v2/<sequence>/<tier>/<index4>.webp`.

The tier is picked from the viewport width, with the device pixel ratio capped
at 1.5 — beyond that the extra pixels are invisible on a 16:9 illustration. If
the buffer cannot keep up for a sustained period (90 consecutive starved
samples), the tier is stepped down once and the frames are re-fetched at the
smaller size.

The published site shipped a single tier at quality ~71. That is where the
difference in smoothness comes from: the same frame costs about half as much.

## 4. The buffer

`src/stage/frameBuffer.ts` is the heart of the rebuild. It is deliberately
free of DOM types so it can be unit tested.

### The wanted window

```
playhead, playhead + 1..24 (direction of travel), playhead - 1..3
```

The old implementation used a symmetric ±16 window. A symmetric window spends
half of its budget on frames the reader has already passed. A forward-biased
window is how a video player buffers, and it matches how people scroll.

### Abandoning requests

A request is abandoned only when it is both outside the wanted window *and*
more than 6 frames away from the playhead. The old implementation dropped
every request that left the window, which is why **57% of all frame traffic was
thrown away** on the live site.

Warm-up requests belong to the *next* sequence, so their distance from the
playhead is infinite. The first version of this buffer treated that as "too
far" and aborted every warm-up request on the next tick — the next scene was
therefore never warmed, and the seam between two chapters was always cold.
There is a regression test for it.

### Eviction

Frames are evicted by distance from the playhead, never by "is it in the wanted
set". The old implementation protected the whole wanted window, which is larger
than the cache itself, so nothing was ever evicted and the same frames were
fetched again on the next pass. The frame under the playhead is never dropped.

### Warm-up

A quarter of the request budget is reserved for the first frames of the next
scene. The old implementation appended the next sequence to the same wanted
list, but the look-ahead window always filled the queue, so the next scene was
never actually warmed up.

### Retry

Three attempts with a linear backoff. A frame that runs out of attempts is
given up on and counted in `data-failed-frames`; frames that are still inside
their retry window are not counted there.

### Rendering

The canvas always paints the **closest available** frame in the current
sequence. That is the graceful degradation: a slow connection produces a choppy
film, never a frozen one.

The diagnostic read-out on the canvas is refreshed at ~8 Hz, not per frame:
eight attribute writes per animation frame cost more than the draw itself.

## 5. Measurements

Reproduce with `npm run measure -- --local http://127.0.0.1:5181/ --reference
https://cleared.nonom.xyz/`. The harness throttles the network to 12 Mbps down
and 45 ms RTT, because a localhost server has no latency and a CDN has plenty.

Scrolling 40 steps at 350 ms, viewport 1440x900:

| | live site (v1) | this build (v2) |
|---|---|---|
| initial transfer | 2.74 MB | **2.43 MB** |
| first paint | 932 ms | **128 ms** |
| journey transfer | 5.4-13.2 MB | **4.6 MB** |
| frames delivered | 156 | **943** |
| delivered rate | 11 fps | **32.9 fps** |
| requests abandoned | **39%** | **15.5%** |
| scrub lag (median, within a sequence) | **42 frames (1.75 s)** | **0** |
| 4 s after scrolling stops | frame 187 of 187 | **frame 187 of 187** |

The live site's numbers vary between runs because the edge cache state varies:
the journey transfer was measured at 5.4 MB, 8.4 MB, 9.8 MB and 13.2 MB on
four runs, and the delivered rate between 5.8 and 13.7 fps. The local numbers
are stable (32.9-36 fps, 13.7-15.5% abandoned) because the frames are served
from the same origin.

Both builds *do* settle on the exact frame once the reader stops. The
difference is during the motion: the live site trails the playhead by 42
frames — a second and three quarters of footage — while this build trails it by
nothing.

The first two rows are where the difference in the opening seconds shows up: the
film starts a second and a half sooner and costs a third less.

### Where the initial payload went

| | live site | this build |
|---|---|---|
| hero idle loop | 1.87 MB | **295 KB** (VP9, 960 px, CRF 34) |
| poster + bridge poster | 231 KB | 231 KB |
| first frames | 683 KB (8 x 85 KB) | 475 KB (8 x 59 KB) |
| bundle | 85 KB | 80 KB |

The idle loop was 69% of the initial payload. It is decorative, it was loaded
eagerly with `preload="auto"`, and it was encoded at 1.9 Mb/s. It is now
re-encoded at 960 px in VP9 and its source is not even attached until the
browser is idle.

## 6. Accessibility

The reduced-motion mode is not a cosmetic variant: the stage is removed from
the DOM entirely and the page becomes a document.

| finding | fix |
|---|---|
| chapter text announced twice (as `alt` and as the paragraph) | illustrations are decorative, `alt=""` |
| story still reachable by assistive tech while the menu is open | `<main inert>`; verified against the Chrome accessibility tree: the `main` node disappears, seven regions go with it |
| dialog and inner nav both named "Navigasi" | the nav is "Tautan utama" |
| `.media-notice` at 10 px | 12 px, `role="status"`, and it is actually rendered when the idle video fails |
| instant jump on menu links | `scroll-behavior: smooth`, disabled under reduced motion |

Contrast, measured from the tokens: body 16.7:1, accent 14.8:1, muted 9.7:1,
link separator 6.4:1 — all clear AA.

## 7. Deliberate limitations

- **A tier downgrade is not reversible.** Stepping down re-fetches everything at
  the smaller size. The threshold is deliberately high (90 consecutive
  starved samples) so it only happens on a genuinely bad connection.
- **The frames are 24 fps.** A 12 fps sequence would halve the bandwidth and
  still read as a film at reading speed, but it would lose the hand-drawn
  cadence. It is a one-line change in `scripts/frames.json`.
- **The 1280 tier is upscaled on wide displays.** The source is 1280 px, so a
  1440 px viewport shows a 12% upscale. A 1920 tier would fix it at the cost of
  roughly 80 MB more origin storage.
- **The idle loop is not played in reduced-motion mode.** It is decorative, and
  the mode is meant to be still.

## 8. Resolved transitions

- **Dual-canvas cross-fade.** Between narrative sequences (`bridge` → `opening`
  → `ending`), two overlapping canvases alternate. The active canvas retains the
  last frame of the outgoing sequence until the incoming sequence's first frame
  is ready in the buffer. The new canvas then fades in with a 260 ms ease while
  the old canvas fades out, eliminating frozen cuts or black flashes across
  chapter boundaries. Warmed ahead with forward prefetching at chapter ends
  (`the-ignition` pre-warms `ending`).
