# 1. The film is a frame sequence, not a video

Date: 2026-10-21

## Status

Accepted

## Context

The story is scrubbed by the scroll position. A reader can stop anywhere,
scroll back, and move again in a fraction of a second. Three requirements
follow:

1. the frame on screen must match the scroll position exactly;
2. scrolling must never wait for a decoder;
3. scrolling back must not re-download anything.

An ordinary video gives none of them. The decoded frame lags the seek target,
a fast scroll either stalls or drops frames, and revisiting a moment means
decoding again.

## Decision

Publish every frame of the source clips as an individual WebP and let the
scroll position pick the index. The client fetches frames around the playhead,
decodes them with `createImageBitmap` and paints them on a canvas.

## Consequences

- Scrubbing is exact: the frame *is* the position.
- Frames are immutable files, so the edge can cache them forever and a revisit
  is free.
- The network cost is a function of how fast the reader scrolls, not of the
  clip length.
- The source clips become build inputs. They are not served at runtime.
- The buffer around the frames has to be right, or the exactness is lost in
  practice. The first implementation abandoned 57% of all frame traffic and
  never caught up with the reader; see ADR 3.
