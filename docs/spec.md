# CLEARED v2 — spec

The requirements this rebuild is measured against. Derived from the audit of the
published site (`cleared.nonom.xyz`) and accepted as the work list.

## Performance

1. **The hero idle loop must not dominate the first load.** It is the heaviest
   single asset and it is decorative: it must not be referenced before the
   browser is idle, and it must be re-encoded at a sane bitrate.
2. **The frame buffer must not throw away useful requests.** A request is only
   abandoned when it is both out of the wanted window and far from the
   playhead.
3. **The cache must evict by distance, not by window membership.** A frame that
   has just been fetched must not be dropped because the playhead moved.
4. **More requests in flight.** The old limit of 4 was the bottleneck.
5. **Smaller frames.** The same 24 fps, published at a lower quality and in
   three widths, so the pipeline can reach the source frame rate.
6. **Keep 24 fps.** The cadence is the point.
7. **Drop the dead bridge MP4s from the public path** — they are build inputs,
   not runtime assets.

## Accessibility

8. **Chapter text must not be announced twice.** The illustration is decorative;
   the caption carries the text.
9. **The story must be unreachable by assistive technology while the menu is
   open.** `inert`, not just `opacity: 0`.
10. **The dialog and the navigation inside it must not share a name.**
11. **The media fallback notice must be legible** and must be announced.

## Quality

12. **The film must keep up with the reader.** When scrolling stops, the canvas
    must settle on the exact frame.
13. **Reduced motion must be a first-class mode**, not a cosmetic variant.
14. **The scroll must be smooth**, and the reduced-motion override must still
    apply.
15. **The language switch must keep working**, with typed keys so a missing
    translation is a build error.

## Constraints

- The narrative, the illustrations and the copy stay as they are.
- Indonesian and English, switchable without a reload.
- The experience must work with JavaScript and, where possible, without it.
- The bundle must stay small enough to load on a slow connection.
