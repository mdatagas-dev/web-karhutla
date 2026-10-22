# DOKUMENTASI LENGKAP PROYEK — CLEARED (REBUILD)

> **"Berkas beres. Hutan habis."** — *Paperwork done. Forest gone.*  
> Satire fiksi bergambar interaktif tentang kebakaran hutan di Kalimantan: dari meja rapat ber-AC dan tanda tangan izin hingga asap pekat di paru-paru warga.

Dokumentasi ini merangkum seluruh aspek teknis, arsitektur, pipeline aset, struktur kode, logika interaksi, serta panduan deployment untuk proyek web ini.

---

## 1. Ikhtisar & Filosofi Teknis

Situs ini dibangun menggunakan pendekatan **scrollytelling interaktif presisi tinggi**. Berbeda dengan situs berbasis video streaming biasa (`<video>` dengan scrub waktu yang lambat dan rentan buffering), proyek ini menggunakan arsitektur **Frame Sequence Scrubbing**:

1. **Scrub Presisi Frame-by-Frame**: Setiap frame dari film sumber diekstraksi ke gambar individual format WebP (`public/frames/v1/`). Posisi scroll pengguna langsung menentukan indeks frame yang digambar ke `<canvas>`.
2. **Tanpa Buffering Video**: WebP frame di-prefetch secara prediktif via `FrameBuffer` (forward-biased). Browser memuat frame sebelum playhead mencapainya.
3. **Efisiensi Caching**: Setiap frame memiliki URL deterministik (`/frames/v1/<sequence>/<tier>/<index>.webp`), sehingga dapat di-cache secara permanen (`immutable`, `max-age=31536000`) di browser maupun CDN edge.
4. **Rendering Hardware-Accelerated**: Canvas dirender via 2D Context GPU dengan `imageSmoothingQuality = 'high'`, menghasilkan gambar tajam berkualitas HD tanpa artefak blur atau lag CSS transition.

---

## 2. Struktur Direktori Proyek

```
web-show/
├── index.html                      # Entry HTML, SEO metadata, OG tags, JSON-LD schema
├── package.json                    # Dependency, scripts, konfigurasi proyek
├── vite.config.ts                  # Konfigurasi Vite bundler (ES2022, lightningcss)
├── tsconfig.json                   # Konfigurasi TypeScript strict
├── HANDOFF.md                      # Log historis perubahan & koordinasi tim
├── DOCUMENTATION.md                # Dokumen teknis lengkap (file ini)
│
├── public/                         # Aset statis runtime
│   ├── favicon.svg                 # Logo daun CLEARED
│   ├── media/                      # Still artwork (.webp) & Video idle hero (.mp4)
│   │   ├── signature.webp          # Poster hero tanda tangan
│   │   ├── handshake.webp          # Poster hero jabat tangan
│   │   ├── puppeteer.webp          # Poster hero dalang
│   │   ├── signature-idle.mp4      # Ambient loop hero tanda tangan (HD 1280x720)
│   │   ├── handshake-idle.mp4      # Ambient loop hero jabat tangan (HD 1280x720)
│   │   ├── puppeteer-idle.mp4      # Ambient loop hero dalang (HD 1280x720)
│   │   ├── bridge-signature.webp   # Poster transisi bridge tanda tangan
│   │   ├── bridge-handshake.webp   # Poster transisi bridge jabat tangan
│   │   ├── bridge-puppeteer.webp   # Poster transisi bridge dalang
│   │   ├── first-cut.webp          # Poster bab "Izin turun ke tanah"
│   │   ├── the-clearing.webp       # Poster bab "Target tercapai"
│   │   ├── the-ignition.webp       # Poster bab "Fase pembersihan"
│   │   ├── landscape.webp          # Lapisan latar panorama hutan (2172x724)
│   │   ├── foreground.webp         # Lapisan depan panorama tebang (2172x724)
│   │   ├── the-air-between-us.webp # Poster bab "Warga yang membayar"
│   │   ├── the-record.webp         # Poster bab "Yang tidak masuk berkas"
│   │   └── accountability.webp     # Still penutup daun hangus di peta
│   │
│   └── frames/v1/                  # 2.352 frame sequence asli WebP
│       ├── signature-bridge/       # 192 frame (tier 1280 & 768)
│       ├── handshake-bridge/       # 192 frame (tier 1280 & 768)
│       ├── puppeteer-bridge/       # 192 frame (tier 1280 & 768)
│       ├── opening/                # 360 frame (tier 1280 & 768)
│       └── ending/                 # 240 frame (tier 1280 & 768)
│
├── src/
│   ├── main.tsx                    # Entry point React 19
│   ├── App.tsx                     # Root orchestrator: journey, hero selector, layout
│   │
│   ├── content/                    # Data narasi & matematika pementasan
│   │   ├── scenes.ts               # Definisi bab, timing klip, easing, focal point
│   │   └── sequences.generated.ts  # Total frame per sequence & FPS (24 fps)
│   │
│   ├── hooks/                      # React custom hooks
│   │   ├── useJourney.ts           # Konversi scroll position -> Scene ID + Progress
│   │   └── useReducedMotion.ts     # Deteksi preferensi aksesibilitas gerakan
│   │
│   ├── i18n/                       # Internasionalisasi (Bilingual ID/EN)
│   │   ├── catalog.ts              # Kamus teks kompilasi (@lingui/core)
│   │   ├── catalog.test.ts         # Unit test integritas katalog pesan
│   │   ├── i18n.ts                 # State manager bahasa & locale persistence
│   │   └── translate.ts            # Hook helper pemanggil teks `t(key)`
│   │
│   ├── stage/                      # Sistem panggung & renderer film
│   │   ├── Stage.tsx               # Komposisi layer (Film, Parallax, Shade, Ink)
│   │   ├── FrameSequence.tsx       # Canvas renderer dengan WebP decoding
│   │   ├── IdleFilm.tsx            # Komponen video ambient idle hero
│   │   ├── frameBuffer.ts          # Buffer antrean frame prediktif
│   │   ├── frameBuffer.test.ts     # Unit test eviction & prefetching buffer
│   │   ├── tiers.ts                # Ladder resolusi (1280 HD & 768 mobile)
│   │   ├── tiers.test.ts           # Unit test resolusi ladder
│   │   └── resolveScene.ts         # Mapping scene ID ke sequence & frame window
│   │
│   ├── ui/                         # Komponen antarmuka teks & navigasi
│   │   ├── Header.tsx              # Navbar tetap (Logo, Bahasa, Tombol Menu)
│   │   ├── LanguageSwitch.tsx      # Switcher ID / EN
│   │   ├── MenuDialog.tsx          # Fullscreen modal navigasi (<dialog>)
│   │   ├── ChapterSection.tsx      # Elemen teks bab yang di-pin saat scroll
│   │   └── Closing.tsx             # Bagian penutup & footer credit
│   │
│   └── styles/
│       └── app.css                 # Stylesheet produksi utama
│
└── scripts/                        # Utility & data generation
    ├── build-i18n.mjs              # Kompilator json i18n -> catalog.ts
    ├── fetch-original-frames.mjs   # Pengunduh frame asli dari origin live
    ├── fetch-assets.mjs            # Pengunduh media still & video
    ├── build-frames.mjs            # Ekstraktor ffmpeg lokal (opsional)
    └── i18n/                       # Sumber teks mentah
        ├── id.json                 # Teks bahasa Indonesia
        └── en.json                 # Teks bahasa Inggris
```

---

## 3. Alur Narasi & Struktur Bab (Chapters)

Pengalaman narasi dibagi menjadi 8 bab berurutan yang diikat oleh scroll pengguna:

| ID Bab | Judul (ID) | Heading / Emosional | Sequence Visual |
|---|---|---|---|
| `top` | Halaman Awal | *Paperwork done. Forest gone.* | Hero Idle Loop (`.mp4`) |
| `bridge` | Jembatan Transisi | *Tanda Tangan / Jabat Tangan / Dalang* | `[hero]-bridge` (192 frame) |
| `first-cut` | Izin Turun ke Tanah | *Disetujui.* | `opening` frame 0–119 |
| `the-clearing` | Target Tercapai | *Target dipenuhi.* | `opening` frame 120–215 |
| `the-ignition` | Fase Pembersihan | *Rata dengan tanah.* | `opening` frame 216–359 |
| `beyond-the-boundary` | Di Luar Yurisdiksi | *Asap tidak punya KTP.* | Parallax 2 lapis (`landscape` + `foreground`) |
| `the-air-between-us` | Warga yang Membayar | *Untung privat. Paru-paru publik.* | `ending` frame 0–95 (reveal inset) |
| `the-record` / `act` | Yang Tertinggal | *Daun ini tidak setuju.* | `ending` frame 96–239 + Still `accountability.webp` |

### 3 Varian Hero (Random / Pinned)
Pada setiap kunjungan baru, web secara acak memilih 1 dari 3 metafora elit politik:
1. **The Signature (`signature`)**: Sosok berjas memegang pena emas memotong hutan.
2. **The Handshake (`handshake`)**: Dua tangan raksasa berjabat di atas bentang alam.
3. **The Puppeteer (`puppeteer`)**: Dalang tak berwajah mengendalikan alat berat lewat benang.

*Tips pengujian*: Tambahkan query `?hero=signature`, `?hero=handshake`, atau `?hero=puppeteer` pada URL untuk mengunci karakter tertentu.

---

## 4. Arsitektur Teknis Sistem Panggung (Stage)

### 4.1. Playhead & Interpolasi Scroll (`useJourney.ts`)
- Script menghitung tinggi total dokumen dan posisi elemen `[data-chapter]`.
- Setiap scroll menghasilkan state `{ scene, progress, direction }`.
- `progress` bernilai `0.00` hingga `1.00` di dalam rentang bab tersebut.

### 4.2. Prediktif Frame Buffer (`frameBuffer.ts`)
- Buffer mengantisipasi arah gerakan pengguna (`direction: 1` atau `-1`).
- Meminta `lookAhead: 24` frame ke depan dan mempertahankan `lookBehind: 3` frame di belakang.
- Decode dilakukan asinkron di background via `createImageBitmap(blob)`, sehingga rendering thread utama tetap berjalan pada 60 FPS tanpa freezing.
- Frame yang terlalu jauh dari playhead secara otomatis dibatalkan (`AbortController`) untuk menghemat bandwidth.

### 4.3. Tingkat Resolusi (Rendition Tiers)
Situs mendukung 2 tingkatan resolusi adaptif:
- **Tier 1280** (`1280x720`): Digunakan pada layar desktop (lebar $\ge 820\text{ px}$).
- **Tier 768** (`768x432`): Digunakan pada perangkat mobile demi efisiensi memori GPU dan kuota data.

### 4.4. Parallax Landscape (`Stage.tsx`)
Pada bab `beyond-the-boundary`, panggung beralih ke rendering ilustrasi horizontal bertingkat:
- **Latar belakang (`landscape.webp`)**: Bergerak dengan rasio dasar 1:1 mengikuti scroll.
- **Latar depan (`foreground.webp`)**: Bergerak dengan kecepatan $1.45\times$ lebih cepat untuk menghasilkan ilusi kedalaman 3D (parallax depth).

---

## 5. Internasionalisasi (i18n)

Situs mendukung penuh dwibahasa:
- **Bahasa Indonesia (`id`)** — Bahasa default.
- **English (`en`)** — Bahasa internasional.

### Mekanisme Deteksi Bahasa
1. Membaca query string URL `?lang=id` atau `?lang=en`.
2. Jika tidak ada, membaca preferensi yang tersimpan di browser (`localStorage.getItem('cleared-language')`).
3. Jika belum pernah memilih, mendeteksi preferensi sistem browser (`navigator.language`).

### Mengubah Konten Teks
Sumber teks berada di:
- `scripts/i18n/id.json`
- `scripts/i18n/en.json`

Setelah mengedit file JSON tersebut, jalankan perintah:
```bash
npm run i18n:build
```
Script akan memvalidasi kesamaan key dan mengompilasi `src/i18n/catalog.ts` secara otomatis.

---

## 6. Aksesibilitas (Reduced Motion / Reading Mode)

Bagi pembaca yang mengaktifkan preferensi sistem *Reduced Motion* (atau perangkat dengan keterbatasan grafis):
- Seluruh sequence animasi scroll dinonaktifkan.
- Halaman otomatis beralih ke format **Editorial Reading Mode**:
  - Film diubah menjadi gambar still berkualitas tinggi di awal setiap bab.
  - Teks narasi mengalir vertikal seperti esai visual majalah panjang.
  - Menghilangkan beban komputasi canvas dan video loop.

---

## 7. Cara Menjalankan & Memverifikasi

### Kebutuhan Sistem
- Node.js versi 18 atau lebih baru.
- Port default dev server: `5181` (atau `5173`).

### Perintah Utama

```bash
# 1. Jalankan development server
npm run dev -- --port 5181

# 2. Jalankan build produksi (TypeScript + Vite bundle)
npm run build

# 3. Jalankan suite pengujian unit (Vitest)
npm run test

# 4. Linting kode (Oxlint)
npm run lint

# 5. Kompilasi ulang kamus bahasa (i18n)
npm run i18n:build
```

---

## 8. Panduan Deployment ke Domain Sendiri

Ketika Anda siap mengunggah web ini ke server atau domain pribadi (misalnya `https://domainanda.com`), ikuti langkah konfigurasi berikut:

### 8.1. Perbarui Metadata di `index.html`
Buka file `index.html` dan sesuaikan tag berikut:
```html
<!-- Ganti URL canonical -->
<link rel="canonical" href="https://domainanda.com/" />

<!-- Ganti OpenGraph URL -->
<meta property="og:url" content="https://domainanda.com/" />

<!-- Ganti Schema JSON-LD URL -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "CLEARED",
  "url": "https://domainanda.com/",
  ...
}
</script>
```

### 8.2. Konfigurasi Cache Web Server (Nginx / Cloudflare / Apache)
Untuk performa maksimal dan scrubbing sehalus aslinya, atur header cache:
- `/frames/**` dan `/media/**`:
  `Cache-Control: public, max-age=31536000, immutable`
- `/assets/**` (hasil build Vite JS/CSS):
  `Cache-Control: public, max-age=31536000, immutable`
- `/index.html`:
  `Cache-Control: public, max-age=0, must-revalidate`

---

## 9. Atribusi & Kredit

- **Karya Seni & Konsep Asli**: CLEARED (nonom.xyz).
- **Desain & Pengembangan Rebuild**: Rakito.
- **Lisensi**: Proyek satire seni interaktif untuk edukasi publik dan penyadartahuan krisis lingkungan hidup.
