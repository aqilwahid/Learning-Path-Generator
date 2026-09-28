# Arsitektur

## Gambaran besar

```
                ┌────────────────────── Browser ──────────────────────┐
 Instruktur ──► │ /instruktur  (dashboard sesi)                        │
 Peserta    ──► │ /isi  /isi/[kode]  (form mandiri)                    │
                │                                                      │
                │  Engine (TS murni) ─► ParticipantPlan / InstitutionPlan
                │        │                                             │
                │        ▼                                             │
                │  Template satori ─► SVG ─► resvg-wasm ─► PNG          │
                │                        └─► jsPDF+svg2pdf ─► PDF       │
                │  Penyimpanan: localStorage (mode lokal)              │
                └───────────────┬──────────────────────────────────────┘
                                │ fetch (mode cloud)
                ┌───────────────▼──────────── Next.js API (Node) ───────┐
                │ /api/health            status mode                    │
                │ /api/auth/*            passcode → cookie HMAC         │
                │ /api/sessions/*        CRUD sesi & peserta (instruktur)│
                │ /api/public/sessions/* info sesi & isian peserta      │
                │ /api/v1/plan|render    API integrasi (API key)        │
                │        │                                              │
                │        ▼                                              │
                │ SessionStore ─► Upstash Redis (REST)  | memori (dev)  │
                └───────────────────────────────────────────────────────┘
```

## Lapisan

| Lapisan | Lokasi | Catatan |
|---|---|---|
| Data | `data/**/*.json` | Sumber kebenaran; divalidasi Zod saat dimuat dan oleh unit test |
| Katalog & BNSP | `src/lib/catalog`, `src/lib/bnsp` | Membangun indeks (role, paket, topik, track, skema) |
| Engine | `src/lib/engine` | Fungsi murni tanpa I/O — dipakai UI, API, dan tes |
| Render | `src/lib/render` | `individual.tsx` & `institution.tsx` (JSX untuk satori), `svg.ts`, `client.ts` (browser), `png-node.ts` (server) |
| I/O | `src/lib/io` | Template Excel (ExcelJS, dropdown), impor Excel/CSV, rekap Excel |
| Server | `src/lib/server` | Konfigurasi env, auth, penyimpanan, logika sesi, serialisasi API |
| UI | `src/app`, `src/components` | Next.js App Router + Tailwind CSS 4 |

## Keputusan desain

- **Rendering di browser.** Gambar peserta dibuat di perangkat pengguna → data tidak perlu dikirim ke server untuk dirender, dan beban server nol. API `/api/v1/render` memakai template yang sama di server (resvg native) untuk integrasi.
- **Teks sebagai path.** satori mengubah teks menjadi outline glyph, sehingga PNG/PDF identik di semua perangkat tanpa bergantung font sistem. Font Plus Jakarta Sans disematkan (base64) di `src/lib/render/fonts-data.ts`.
- **satori 0.32.0 dipin.** Versi 0.33+ memakai HarfBuzz yang memuat `hb.wasm` lewat `fs`/URL relatif — tidak cocok untuk bundel browser Next.js. 0.32 memakai opentype.js dan sudah mencukupi.
- **Mode penyimpanan ditentukan env.** Tanpa Upstash → mode lokal (localStorage). Dengan Upstash **dan** passcode → mode cloud. Upstash tanpa passcode sengaja **tidak** mengaktifkan mode cloud agar data peserta tidak terbuka.
- **Engine deterministik.** Tidak ada AI/LLM: hasil yang sama untuk input yang sama, mudah diaudit untuk proposal.
- **Data berbasis file.** Memperbarui katalog/skema cukup mengubah JSON lalu push; unit test menjaga konsistensi.

## Model data Redis (mode cloud)

| Kunci | Tipe | Isi |
|---|---|---|
| `nglp:session:{id}` | string (JSON) | metadata sesi + pengaturan |
| `nglp:session:{id}:participants` | hash | `{participantId: JSON {p, editToken}}` |
| `nglp:code:{KODE}` | string | id sesi untuk link peserta |
| `nglp:sessions` | sorted set | indeks sesi (skor = waktu dibuat) |
| `nglp:hit:*` | counter | pembatas laju login & isian |

Semua kunci sesi diberi `EXPIREAT` sesuai `expiresAt` (`RETENTION_DAYS`).

## Keamanan

- Cookie `nglp_auth` = `exp.hmac(exp)` (HMAC-SHA256, `SESSION_SECRET`), HttpOnly, SameSite=Lax, Secure di produksi, 12 jam.
- Login dibatasi 10 percobaan/15 menit per IP; isian peserta 30/10 menit per IP per sesi; kuota 500 peserta/sesi.
- Isian peserta hanya bisa memperbarui record miliknya lewat `editToken` acak yang disimpan di browser peserta.
- Body JSON dibatasi 2 MB dan divalidasi Zod di setiap endpoint.
- Header keamanan dasar (nosniff, frame SAMEORIGIN, referrer policy) di `next.config.ts`.
