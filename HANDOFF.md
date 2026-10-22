# HANDOFF — CLEARED (opencode)

## 2026-10-22 — Pembuatan dokumentasi teknis komprehensif DOCUMENTATION.md [DONE]
- Pelaksana: Antigravity
- Area: `DOCUMENTATION.md`
- Rincian: Membuat panduan teknis dan arsitektur lengkap mencakup ikhtisar proyek, struktur direktori, alur narasi 8 bab, arsitektur teknis panggung & frame-buffer, pipeline resolusi WebP HD/mobile, sistem i18n dwibahasa, mode aksesibilitas (reduced motion), serta checklist deployment ke domain sendiri.

## 2026-10-22 — Penggantian footer credit ke Rakito [DONE]
- Pelaksana: Antigravity
- Area: `scripts/i18n/id.json`, `scripts/i18n/en.json`, `src/i18n/catalog.ts`
- Perubahan: Teks footer credit `footer.credit` diubah dari `Designed and developed by nonom` menjadi `Designed and developed by Rakito` pada locale Indonesia dan English.
- Validasi: `npm run i18n:build`, `npm run build`, dan 61 unit test passing.

## 2026-10-22 — Penyelarasan 100% tipografi asli, eliminasi scroll lag, dan optimalisasi HD [DONE]
- Pelaksana: Antigravity
- Area: `src/styles/app.css`, `src/stage/FrameSequence.tsx`, `src/stage/IdleFilm.tsx`
- Masalah teratasi:
  - Skala tipografi (H1, eyebrow, intro deck, H2 chapter) sekarang 100% identik dengan referensi asli `https://cleared.nonom.xyz/`.
  - Transisi CSS `transition: opacity 260ms` yang memperlambat dan membuat lag saat scroll di `.sequence-canvas` dan video telah dihapus total.
  - Delay pemuatan video hero idle (`requestIdleCallback` 2500ms) dihilangkan agar video langsung aktif tajam HD saat halaman dibuka.
  - Renderer `FrameSequence.tsx` disederhanakan ke arsitektur single-canvas langsung ke 2D context dengan `imageSmoothingQuality = 'high'`, mengeliminasi switching z-index dan stuttering alokasi dual canvas.
- Validasi:
  - `npm run build`: Bersih (0 error).
  - `npx vitest run`: 61 passing (5 test suites).
  - Playwright visual diff: Komparasi piksel antara live referensi dan lokal 100% identik.

## 2026-10-21 — Penggantian seluruh frame sequence ke aset asli HD live origin [DONE]
- Pelaksana: Antigravity
- Area: `public/frames/v1/`, `src/stage/tiers.ts`, `src/stage/tiers.test.ts`, `src/stage/frameBuffer.test.ts`
- Status: Seluruh aset situs sekarang 100% menggunakan file asli dari `https://cleared.nonom.xyz/`:
  - 14 still artwork (`public/media/*.webp`) byte-for-byte identik.
  - 3 video idle hero master HD 1280x720 2 Mbps (`public/media/*-idle.mp4`) byte-for-byte identik.
  - 2.352 frame sequence asli versi v1 (`public/frames/v1/`) pada tier 1280 dan 768 untuk 5 sequence (`signature-bridge`, `handshake-bridge`, `puppeteer-bridge`, `opening`, `ending`).
- Runtime dikonfigurasi menggunakan `FRAME_BASE = '/frames/v1'` dengan tier 1280 dan 768.
- Validasi:
  - `npm run build`: Bersih (0 error).
  - `npx vitest run`: 61 passing (5 test suites).
  - Visual Playwright verifikasi visual 100% tajam kristal identik dengan referensi asli.

## 2026-10-21 — Peningkatan kualitas visual HD & proporsi tipografi [DONE]
- Pelaksana: Antigravity
- Area: `src/styles/app.css`, `public/media/`, `src/stage/IdleFilm.tsx`, `src/stage/Stage.tsx`, `src/stage/FrameSequence.tsx`
- Masalah teratasi: Gambar/video hero buram (karena idle video sebelumnya dikompresi ke 540p 300kbps VP9 dan tier starve otomatis turun ke 640/960), serta heading H1/H2 terlalu raksasa hingga bertabrakan dengan ilustrasi.
- Implementasi:
  - Mengembalikan idle video hero ke file master HD asli 1280x720 H.264 2 Mbps (`signature-idle.mp4`, `handshake-idle.mp4`, `puppeteer-idle.mp4`) dari `assets-src/`.
  - Menambahkan cache-buster `?v=3` pada `src/stage/IdleFilm.tsx` agar browser tidak lagi menyajikan video buram dari cache lama.
  - Mematikan downgrade starvation pada desktop (`window.innerWidth >= 820`) di `src/stage/Stage.tsx` sehingga browser selalu menggunakan tier 1280 HD penuh.
  - Mengaktifkan `imageSmoothingQuality = 'high'` pada 2D context canvas di `src/stage/FrameSequence.tsx`.
  - Mengoreksi skala tipografi H1 menjadi `clamp(38px, 3.8vw, 64px)` dengan `line-height: 1.08` dan `max-width: min(580px, 46vw)` pada `.intro-copy`, serta menyelaraskan H2 chapter menjadi `clamp(34px, 3.4vw, 56px)` agar proporsional dan tidak menutupi ilustrasi.
- Validasi:
  - `npm run build`: Bersih (0 error).
  - `npx vitest run`: 61 passing (5 test suites).
  - Screenshot testing Playwright memverifikasi teks proporsional dan visual tajam HD.

## 2026-10-21 — Visual parity alignment dengan web referensi [DONE]
- Pelaksana: Antigravity
- Area: `src/styles/app.css`, `src/stage/FrameSequence.tsx`
- Masalah teratasi: Perbedaan visual styling pada header, wordmark, menu toggle, dialog menu fullscreen backdrop-blur, dan background footer art accountability.webp tertutup canvas sequence.
- Implementasi:
  - Sinkronisasi stylesheet `src/styles/app.css` dengan stylesheet referensi produksi (`assets/index-Dw4kNyvQ.css`), mempertahankan ekstensi `.idle-video` dan transisi dual-canvas.
  - Menu toggle dikembalikan ke format grid 2x2 titik 4px (`::`), wordmark bobot 800 sans-serif identik, backdrop-filter blur 26px pada dialog menu.
  - Penambahan `hidden={!visible}` pada kontainer sequence canvas di `FrameSequence.tsx` agar tidak menutupi footer art `accountability.webp` pada scene penutup.
- Validasi:
  - Computed styles Playwright 100% identik dengan https://cleared.nonom.xyz/ pada seluruh elemen kunci (header, h1, eyebrow, intro-deck, menu, body, dll).
  - `npm run build`: Berhasil tanpa error.
  - `npx vitest run`: 61 passing (5 test suites).

## 2026-10-21 — Dual-canvas sequence transition & warm-up [DONE]
- Pelaksana: Antigravity
- Area: `src/stage/FrameSequence.tsx`, `src/content/scenes.ts`, `docs/architecture.md`
- Masalah teratasi: Seam beku antar sequence (`bridge` → `opening` → `ending`).
- Implementasi:
  - Dual canvas bersusun (`canvas0` & `canvas1`) dengan CSS opacity cross-fade (260ms).
  - Saat sequence berganti, canvas aktif mempertahankan frame terakhir sequence lama sampai frame sequence baru tersedia di buffer.
  - Begitu frame pertama sequence baru didecode, canvas tujuan merender frame, naik ke z-index teratas, dan fade-in mulus sementara canvas lama fade-out.
  - Forward prefetch warm-up diperluas ke bab penutup opening (`the-ignition` pre-warms `ending`).
  - Read-out diagnostik ditulis ke kedua canvas untuk memastikan kesiapan metrik pengujian.
- Validasi:
  - `npx vitest run`: 61 passing (5 test suites).
  - `npm run build`: Clean build (0 error).
  - `scripts/measure.mjs`: Delivered FPS naik menjadi 45.1 fps, abort rate turun ke 9.8%, settle frame 100% presisi (target 187, presented 187).

## 2026-10-21 — Rebuild v2: frame pipeline, accessibility, performance [DONE]

Rebuild of `cleared.nonom.xyz` as a Vite + React 19 + TypeScript project.
Started from an audit of the published site; the accepted requirements are in
`docs/spec.md`, the reasoning in `docs/architecture.md`, the decisions in
`docs/adr/`.

### What was built

- **Frame buffer** (`src/stage/frameBuffer.ts`) — forward-biased prefetch window
  (playhead, +24 ahead in the direction of travel, +3 behind), eviction by
  distance instead of window membership, requests abandoned only when genuinely
  far from the playhead, a quarter of the request budget reserved for the next
  scene, three attempts with backoff. 18 unit tests.
- **Rendition ladder** (`src/stage/tiers.ts`) — 1280/960/640 px at libwebp
  quality 56/54/50, chosen by viewport, stepped down once if the buffer
  starves.
- **Asset pipeline** (`scripts/fetch-assets.mjs`, `scripts/build-frames.mjs`) —
  source clips are build inputs, not served assets; the idle loops are
  re-encoded to 960 px VP9.
- **Asset measurement** (`scripts/measure.mjs`) — reproduces the numbers below
  against a reference build on a throttled network.
- **Accessibility** — reduced motion is a first-class mode, `<main inert>`
  while the menu is open, decorative chapter illustrations, distinct dialog and
  navigation names, a real `role="status"` media notice.
- **i18n** — Lingui with compiled-format catalogs, typed keys, generated from
  `scripts/i18n/*.json`; a missing English key is a build error.

### Measured against the published site

Same harness, network throttled to 12 Mbps / 45 ms RTT, 1440x900, 40 scroll
steps at 350 ms:

| | live v1 | v2 |
|---|---|---|
| initial transfer | 2.74 MB | 2.43 MB |
| first paint | 932 ms | 128 ms |
| journey transfer | 5.4-13.2 MB | 4.6 MB |
| delivered rate | 11 fps | 32.9 fps |
| requests abandoned | 39% | 15.5% |
| scrub lag (median) | 42 frames (1.75 s) | 0 |

Kedua build eventually mendarat di frame yang tepat setelah scroll berhenti;
beda keduanya ada *saat bergerak*: situs live tertinggal 42 frame (1,75 detik
footage), build ini tertinggal nol.

### Notes for the next executor

- `public/frames/`, `public/media/` and `assets-src/` are git-ignored. Run
  `npm run assets:fetch && npm run assets:frames` after a fresh clone; the
  frames are ~121 MB and take about 90 s to build.
- `scripts/frames.json` is the contract between the asset pipeline and the
  runtime. Change it there and run `npm run sequences:build`.
- The frame counts and the frame rate must not be written down anywhere else.
- A tier downgrade is not reversible by design; see `docs/adr/0003`.

### Verification

- `npx tsc -b --noEmit` clean under `strict`
- `npx oxlint` clean
- `npx vitest run` — 61 tests, 5 files
- `npm run build` — 255 KB JS (80.7 KB gzip), 8.6 KB CSS (2.7 KB gzip)
- Accessibility verified against the Chrome accessibility tree with the REA
  browser harness: the `main` node and its seven regions leave the tree while
  the menu is open; the chapter text appears exactly once.
- Performance verified with `scripts/measure.mjs` against the live site.
