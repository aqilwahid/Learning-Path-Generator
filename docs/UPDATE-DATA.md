# Memperbarui Data

Semua data ada di folder `data/`. Setelah mengubah file, jalankan:

```bash
npm test
```

Tes akan gagal bila struktur rusak, ada kode ganda, referensi skema tidak ada, atau level tidak berurutan.

## 1. Katalog (`data/catalog/agile-corp-ng-2025_v5.3.json`)

Struktur ringkas:

```jsonc
{
  "version": "5.3",
  "functions": [{ "id": "E", "name": "Development", "label": "E. DEVELOPMENT", "layer": "implementation" }],
  "roles": [{
    "id": "E8", "functionId": "E", "number": 8, "name": "Web Apps Developer",
    "description": "…",
    "packages": [
      { "code": "NG-E81", "level": 1, "title": "Web Apps Developer Foundation",
        "topics": [{ "title": "Fullstack Web Development using PHP, Bootstrap, and MySQL", "days": 4 }] },
      { "code": "NG-E82", "level": 2, "title": "Web Apps Developer Intermediate",
        "tracks": [{ "id": "reactjs", "label": "React.js", "topics": [{ "title": "…", "days": 4 }] }] }
    ]
  }]
}
```

Aturan:
- Kode paket wajib `NG-{fungsi}{nomor role}{level}`; `id` role = `{fungsi}{nomor}`.
- Paket berisi **`topics` atau `tracks`**, tidak keduanya. `id` track berupa slug (huruf kecil, angka, tanda minus); pakai `id` yang sama untuk teknologi yang sama di paket berbeda.
- Level per role harus berurutan mulai 1.
- ID topik dibentuk otomatis (`{kode}#{track|main}#{urutan}`). **Mengubah urutan topik** mengubah ID — isian "topik sudah diikuti" yang tersimpan bisa bergeser.

**Katalog versi baru (mis. 2026):** tambahkan file baru, perbarui import di `src/lib/catalog/index.ts`, lalu sesuaikan angka acuan di `tests/catalog.test.ts`.

## 2. Skema BNSP (`data/bnsp/schemes.json`)

```jsonc
{
  "id": "pengelolaan-data-center",
  "name": "Pengelolaan Data Center",
  "type": "klaster",                 // klaster | okupasi | kkni (opsional)
  "standard": "SKKNI …",             // opsional
  "units": [{ "code": "J.631100.010.01", "title": "…" }],
  "trainingDays": 2, "assessmentDays": 1,
  "prerequisites": "…",
  "sourceIds": ["inix-klaster-dc"]   // wajib: rujuk ke daftar "sources"
}
```

Setiap skema wajib punya minimal satu sumber (`sourceIds`) yang terdaftar di `sources` beserta URL dan tanggal akses.

## 3. Pemetaan role → skema (`data/bnsp/role-scheme-map.json`)

```jsonc
{ "roleId": "G5", "match": "direct", "verified": false,
  "schemes": [
    { "schemeId": "network-administrator-muda", "readyAfterLevel": 1, "priority": 1 },
    { "schemeId": "network-administrator-madya", "readyAfterLevel": 2, "priority": 1 }
  ] }
```

- `match`: `direct` | `partial` | `none` (untuk `none`, `schemes` harus kosong).
- `readyAfterLevel` ≤ level tertinggi role.
- Setelah divalidasi: `verified: true` → catatan "draf" hilang dari gambar peserta dengan role tersebut.

## 4. Sinonim jabatan (`data/aliases/job-titles.json`)

- `keywords`: kata kunci kuat → role langsung dipakai.
- `weak`: kata kunci umum → role dipakai tetapi ditandai "perlu dicek".
- `ambiguous`: jabatan yang sengaja tidak ditebak.

Tambahkan contoh baru ke `tests/engine.test.ts` (bagian *pemetaan jabatan*) agar perilaku terjaga.

## 5. Font gambar

Font ada di `assets/fonts/*.woff` (WOFF, bukan WOFF2). Setelah mengganti font, jalankan `npm run fonts:embed` untuk membuat ulang `src/lib/render/fonts-data.ts`.
