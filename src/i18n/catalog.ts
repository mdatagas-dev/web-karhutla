/**
 * Message catalogs.
 *
 * Generated from `scripts/i18n/*.json`; run `npm run i18n:build` after editing
 * them. The English catalog is typed against the Indonesian one, so a missing or
 * misspelled key is a compile error rather than a runtime blank.
 */

export const ID = {
  'nav.skip': [`Langsung ke cerita`],
  'nav.home': [`CLEARED — kembali ke awal`],
  'nav.open': [`Buka menu`],
  'nav.close': [`Tutup`],
  'nav.language': [`Bahasa`],
  'nav.menu': [`Navigasi`],
  'nav.links': [`Tautan utama`],
  'meta.title': [`CLEARED — Berkas beres. Hutan habis.`],
  'meta.description': [`Satire fiksi bergambar tentang kebakaran hutan di Kalimantan: dari tanda tangan dan kesepakatan tertutup hingga asap di rumah warga.`],
  'hero.eyebrow': [`SEMUA SESUAI PROSEDUR`],
  'hero.line1': [`Berkas beres.`],
  'hero.line2': [`Hutan habis.`],
  'hero.deck': [`Di meja, namanya izin.
Di rumah, namanya asap.`],
  'hero.follow': [`Ikuti garisnya`],
  'hero.scroll': [`GULIR UNTUK MENELUSURI`],
  'hero.signature.name': [`Tanda tangan`],
  'hero.signature.line': [`Sekali tanda tangan. Selebihnya urusan hutan.`],
  'hero.handshake.name': [`Jabat tangan`],
  'hero.handshake.line': [`Yang berjabat tangan sedikit. Yang menanggung asap banyak.`],
  'hero.puppeteer.name': [`Si penarik tali`],
  'hero.puppeteer.line': [`Talinya di atas. Yang tumbang di bawah.`],
  'chapter.first-cut.title': [`Izin turun ke tanah`],
  'chapter.first-cut.heading': [`Sudah disetujui.`],
  'chapter.first-cut.text': [`Rapatnya sudah selesai. Kini mesin yang bicara. Pohon itu, tentu saja, tidak diminta persetujuan.`],
  'chapter.the-clearing.title': [`Pencapaian target`],
  'chapter.the-clearing.heading': [`Target tercapai.`],
  'chapter.the-clearing.text': [`Barisan tunggul. Tumpukan kayu. Rupanya hutan lebih mudah dihitung setelah berhenti menjadi hutan.`],
  'chapter.the-ignition.title': [`Tahap pembersihan`],
  'chapter.the-ignition.heading': [`Beres.`],
  'chapter.the-ignition.text': [`Api mengerjakan sisanya. Di atas peta, garisnya tetap lurus. Di luar peta, semuanya mulai sesak.`],
  'chapter.beyond-the-boundary.title': [`Di luar tanggung jawab`],
  'chapter.beyond-the-boundary.heading': [`Asap tak kenal batas.`],
  'chapter.beyond-the-boundary.text': [`Asap menyeberangi sungai dan masuk ke rumah. Rupanya ia lupa membaca batas wilayah di dokumen.`],
  'chapter.the-air-between-us.title': [`Tagihan untuk warga`],
  'chapter.the-air-between-us.heading': [`Untungnya pribadi.
Sesaknya dibagi.`],
  'chapter.the-air-between-us.text': [`Ia menarik anaknya lebih dekat. Tidak ikut rapat, tidak ikut untung. Tetap kebagian menghirup hasilnya.`],
  'chapter.the-record.title': [`Catatan yang tertinggal`],
  'chapter.the-record.heading': [`Katanya sudah beres.`],
  'chapter.the-record.text': [`Sepotong daun hangus kembali ke peta. Kecil, hitam, dan merepotkan cerita bahwa semuanya baik-baik saja.`],
  'footer.eyebrow': [`HUTAN MENYIMPAN CATATAN`],
  'footer.line2': [`Daun ini tidak setuju.`],
  'footer.body': [`Jangan berhenti di kalimat “sesuai prosedur”.
Telusuri jejaknya. Jaga paru-paru dunia.`],
  'media.failed': [`Cerita berlanjut lewat gambar.`],
  'alt.hero': [`Ilustrasi tokoh-tokoh anonim berjas yang mengendalikan nasib hutan lewat tanda tangan, jabat tangan, atau tali.`],
  'alt.accountability': [`Sehelai daun hangus tergeletak melintasi garis kuning pada peta lahan.`],
  'menu.story': [`Ikuti garisnya`],
  'menu.cost': [`Yang menanggung`],
  'menu.record': [`Lihat jejaknya`],
  'footer.credit': [`Designed and developed by Rakito`],
} as const;

export const EN: Record<keyof typeof ID, readonly [string]> = {
  'nav.skip': [`Skip to the story`],
  'nav.home': [`CLEARED — back to the beginning`],
  'nav.open': [`Open menu`],
  'nav.close': [`Close`],
  'nav.language': [`Language`],
  'nav.menu': [`Navigation`],
  'nav.links': [`Main links`],
  'meta.title': [`CLEARED — Paperwork done. Forest gone.`],
  'meta.description': [`An illustrated fictional satire about forest fires in Kalimantan: from signatures and private deals to smoke in a family's home.`],
  'hero.eyebrow': [`ALL ACCORDING TO PROCEDURE`],
  'hero.line1': [`Paperwork done.`],
  'hero.line2': [`Forest gone.`],
  'hero.deck': [`In the office, it's a permit.
At home, it's smoke.`],
  'hero.follow': [`Follow the line`],
  'hero.scroll': [`SCROLL TO FOLLOW THE LINE`],
  'hero.signature.name': [`The signature`],
  'hero.signature.line': [`One signature. The forest can handle the rest.`],
  'hero.handshake.name': [`The handshake`],
  'hero.handshake.line': [`A private handshake. A very public cloud of smoke.`],
  'hero.puppeteer.name': [`The puppeteer`],
  'hero.puppeteer.line': [`The strings are pulled up here. The trees fall down there.`],
  'chapter.first-cut.title': [`Permission hits the ground`],
  'chapter.first-cut.heading': [`Approved.`],
  'chapter.first-cut.text': [`The meeting is over. Now the machine speaks. The tree, naturally, was not asked for consent.`],
  'chapter.the-clearing.title': [`Target achieved`],
  'chapter.the-clearing.heading': [`Target met.`],
  'chapter.the-clearing.text': [`Neat rows of stumps. Orderly stacks of timber. A forest is apparently easier to count once it stops being a forest.`],
  'chapter.the-ignition.title': [`The clean-up phase`],
  'chapter.the-ignition.heading': [`All cleared.`],
  'chapter.the-ignition.text': [`Fire handles the rest. On the map, the boundary stays straight. Beyond the map, breathing gets harder.`],
  'chapter.beyond-the-boundary.title': [`Outside our jurisdiction`],
  'chapter.beyond-the-boundary.heading': [`Smoke observes no borders.`],
  'chapter.beyond-the-boundary.text': [`Smoke crosses the river and enters a home. Apparently, it forgot to read the boundary on the paperwork.`],
  'chapter.the-air-between-us.title': [`The public pays`],
  'chapter.the-air-between-us.heading': [`Private profit.
Public lungs.`],
  'chapter.the-air-between-us.text': [`A parent pulls their child closer. No seat at the meeting. No share of the profit. Plenty to breathe in.`],
  'chapter.the-record.title': [`The part they left out`],
  'chapter.the-record.heading': [`They called it settled.`],
  'chapter.the-record.text': [`A charred leaf lands on the map. Small, black, and inconvenient for the story that everything went according to plan.`],
  'footer.eyebrow': [`THE FOREST KEPT A RECORD`],
  'footer.line2': [`This leaf disagrees.`],
  'footer.body': [`Don't let “according to procedure” be the last word.
Follow the record. Stand with the lungs of the world.`],
  'media.failed': [`The story continues in stills.`],
  'alt.hero': [`Illustrated anonymous figures in suits control a forest through a signature, a handshake, or strings.`],
  'alt.accountability': [`A single charred leaf lies across the yellow boundary on a land map.`],
  'menu.story': [`Follow the line`],
  'menu.cost': [`Who pays`],
  'menu.record': [`Trace the record`],
  'footer.credit': [`Designed and developed by Rakito`],
};

export type MessageKey = keyof typeof ID;

export const LOCALES = ['id', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'id';

export const CATALOGS: Record<Locale, Record<MessageKey, readonly [string]>> = {
  id: ID,
  en: EN,
};
