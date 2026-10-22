# 2. Three rendition tiers, chosen by viewport

Date: 2026-10-21

## Status

Accepted

## Context

A 1280x720 WebP of these illustrations costs 55-78 KB at the quality the art
needs. At 24 fps that is up to 1.9 MB/s of frames, which no reader on a
mobile connection can absorb while scrolling.

The art is flat-vector, so it survives aggressive compression and downscaling
far better than a photographed scene would.

## Decision

Publish every frame at three widths — 1280, 960 and 640 — at libwebp quality
56, 54 and 50. The client picks the cheapest tier that still covers the
viewport, with the device pixel ratio capped at 1.5. If the buffer cannot keep
up for a sustained period, the tier is stepped down once.

The frame rate stays at 24 fps: the cadence is the point.

## Consequences

- A frame costs about half what it did, so the pipeline can reach the source
  frame rate instead of a third of it.
- The 1280 tier is upscaled on a 1440 px viewport. A 1920 tier would fix it at
  the cost of roughly 80 MB more origin storage.
- The tier is part of the frame URL, so every tier is an independent,
  immutably cacheable file.
