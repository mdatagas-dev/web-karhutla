# 3. A forward-biased prefetch window, and eviction by distance

Date: 2026-10-21

## Status

Accepted

## Context

The first implementation of the buffer treated the wanted window as symmetric
(±16 frames around the playhead), abandoned every request that left the
window, and evicted cached frames that were not in the window.

Measured on a throttled connection, that meant 57% of all frame traffic was
thrown away, the buffer delivered 5.8 frames per second against a source rate
of 24, and four seconds after the reader stopped scrolling the canvas was
still showing frame 97 of 239. The film never caught up.

Three separate mistakes, each with the same shape: a rule that was locally
sensible destroyed work that was still useful.

## Decision

- **Prefetch forward.** The playhead, then 24 frames ahead in the direction of
  travel, then 3 frames behind. A reader almost always scrolls the same way.
- **Abandon only what is genuinely far.** A request is dropped when it is both
  out of the window and more than 6 frames from the playhead. Warm-up requests
  for the next sequence are never dropped for being in another sequence.
- **Evict by distance.** The frame under the playhead is never dropped; the
  farthest frames go first. Membership of the wanted window is not a criterion.
- **Reserve a quarter of the request budget** for the next scene, so the seam
  between two chapters is already warm.

## Consequences

- 35.7 frames per second delivered against a source rate of 24, and a scrub
  lag of 0 frames at the median.
- Four seconds after scrolling stops the canvas is on the exact frame.
- A tier downgrade re-fetches everything at the smaller size, so it is
  deliberately hard to trigger and not reversible.
