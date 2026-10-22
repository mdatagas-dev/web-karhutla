# 4. The source media is a build input, not a served asset

Date: 2026-10-21

## Status

Accepted

## Context

The published site served the three bridge clips (4.3-4.6 MB each) alongside
the frame sequences, even though the runtime never requests them: the canvas
only needs the frame index, never the clip.

## Decision

The source clips live in `assets-src/`, are git-ignored, and are turned into
frames by `npm run assets:frames`. Only the frames, the stills and the
re-encoded idle loops are published.

The idle loops are the exception: they are real video, they are re-encoded to
960 px VP9, and they are the only runtime media besides the frames.

## Consequences

- 13.5 MB of dead weight disappears from the public path.
- The origin keeps the source clips, but they are never in a request path.
- A fresh clone has to run `npm run assets:fetch` before the site has any
  media; the README says so.
