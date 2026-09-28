# Aturan Engine Rekomendasi

Kode: `src/lib/engine/participant-plan.ts`, `institution-plan.ts`, `resolve-role.ts`. Semua aturan di bawah diuji di `tests/engine.test.ts`.

## 1. Level saat ini & target

- **Level saat ini** = nilai `currentLevel` (0–4), dinaikkan otomatis bila paket level berikutnya ada di `completedCodes` secara berurutan.
- **Target** default = level saat ini + 1 (maks. level tertinggi role). Target di atas level tertinggi → disesuaikan + peringatan. Target di bawah level saat ini → disamakan.

## 2. Status paket

| Status | Kondisi |
|---|---|
| `done` | level ≤ level saat ini, ada di `completedCodes`, atau semua topiknya sudah dicentang |
| `planned` | level saat ini < level ≤ target |
| `later` | di atas target (ditampilkan sebagai "Lanjutan") |

Topik yang sudah diikuti (`completedTopicIds`) mengurangi sisa hari paket.

## 3. Track produk (Product Specifics)

Paket bervarian (NG-E82, NG-F31, NG-G21, NG-G42, NG-G61, NG-G62; NG-G81/G82 hanya Linux) memakai **satu track**:

1. preferensi peserta (`trackPrefs`),
2. profil teknologi sesi (`defaultTrackPrefs`),
3. track pertama di katalog → ditandai **otomatis** + peringatan bila ada alternatif.

## 4. Baseline Digital Skill

Bila `includeBaseline` (peserta) atau `baselineForAll` (sesi), NG-A31 ditambahkan sebagai langkah `baseline` — kecuali role target adalah Digital Skill (A3) atau NG-A31 sudah diikuti.

## 5. Penjadwalan

- Periode dimulai `startMonth`, panjang `periodMonths` (1/2/3/6 bulan).
- Kapasitas per periode = `maxDaysPerMonth × periodMonths` (default 5 × 3 = 15 hari).
- Baseline boleh di periode pertama, paralel dengan paket role.
- Paket role berurutan; bila `onePackagePerPeriod` (default), tiap level di periode berbeda.
- Paket yang tidak muat digeser ke periode berikutnya; paket yang lebih besar dari kapasitas tetap dijadwalkan sendiri dan ditandai **melebihi kapasitas**.

## 6. Kelas kohort (rencana instansi)

- Kunci kohort = `kode paket | track | periode`.
- Jumlah kelas = ⌈peserta / `maxClassSize`⌉.
- Mode **in-house** bila peserta ≥ `inHouseMin`, selain itu **reguler** (ikut kelas publik).

## 7. Rekomendasi BNSP

Setiap role punya daftar skema dengan `readyAfterLevel` dan `priority` (`data/bnsp/role-scheme-map.json`).

| Kesiapan | Kondisi | Periode uji |
|---|---|---|
| `ready-now` | level saat ini ≥ `readyAfterLevel` | periode 1 |
| `after-path` | target ≥ `readyAfterLevel` | satu periode setelah paket level tsb. (waktu menyiapkan portofolio/APL-02) |
| `beyond-target` | di atas target | ditampilkan sebagai "Berikutnya" |

Skema **utama** = skema terjangkau dengan `readyAfterLevel` tertinggi (seri → `priority` terkecil). Maks. 3 alternatif. Role dengan `match: "none"` menampilkan "Belum ada skema sepadan". Selama `verified: false`, gambar menampilkan catatan *pemetaan masih draf*.

## 8. Tebak role dari jabatan

- Teks dinormalisasi (huruf kecil, tanpa tanda baca/diakritik), dicocokkan per kata utuh.
- Kandidat: nama role (skor tertinggi), singkatan role (≥ 3 huruf), kata kunci `keywords`, kata kunci lemah `weak`.
- Kata kunci terpanjang menang. Hasil `weak` → "perlu dicek". Jabatan di `ambiguous` (mis. *Pranata Komputer*) tanpa kata kunci kuat → tidak ditebak.
- Contoh: "Pranata Komputer - Admin Jaringan" → G5 (kuat, karena "admin jaringan").
