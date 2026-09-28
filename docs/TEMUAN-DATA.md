# Temuan Data

## A. Poster "Agile Corp NG JobRole v5.3"

Sumber: [`docs/sumber/Agile_Corp_NG_JobRole_v5.3.pdf`](sumber/Agile_Corp_NG_JobRole_v5.3.pdf) (1 halaman, Microsoft Publisher).

| # | Temuan | Penanganan di data |
|---|---|---|
| 1 | **NG-G82** "System Administrator Intermediate" tertulis **Lv.1** | Diperlakukan **Lv.2** (kode `…82` dan judul *Intermediate*). Teks asli di `original.levelLabel`. |
| 2 | Ejaan **"Spesialist"** (NG-E41, E42, E61, E62) vs nama role "Specialist" | Judul paket dinormalisasi ke *Specialist*; teks asli di `original.title`. |
| 3 | **"Advance"** (NG-A33, NG-E103) vs "Advanced" di paket lain | Dinormalisasi ke *Advanced*; teks asli disimpan. |
| 4 | Label track **"MongoDb"** vs "MongoDB", **"VMWare"** | Label track dinormalisasi (*MongoDB*, *VMware*); judul topik tetap seperti poster. |
| 5 | 9 role hanya punya **Lv.1**: AI Product Designer, CDO, CAIO, CSO, DPO, System Analyst, Integration Engineer, Cybersecurity Administrator, Virtualization Specialist | Tidak diubah. Target di atas Lv.1 otomatis disesuaikan. |
| 6 | Beberapa topik terikat versi produk lama (PMBOK6, MS Project 2016/2019, Oracle 12c, VMware v7) | Tidak diubah — catatan untuk pengembangan katalog berikutnya. |

Angka yang divalidasi otomatis (`tests/catalog.test.ts`): **7 fungsi · 34 role · 67 paket · 124 topik · 344 hari** (termasuk semua track alternatif), distribusi level 34/25/6/2, pola kode `NG-{fungsi}{nomor role}{level}`.

## B. Data BNSP

Sumber: halaman publik Inixindo Jogja (daftar di `data/bnsp/schemes.json` → `sources`, diakses 26 September 2026).

| # | Temuan | Dampak |
|---|---|---|
| 1 | Halaman *Sertifikasi IT* mencantumkan **54 program nasional**; 9 halaman klaster + 4 halaman skema lain memuat detail unit | 63 skema tercatat; hanya sebagian yang punya daftar unit |
| 2 | **Nama LSP resmi dan nomor Kepmenaker SKKNI tidak tercantum** di halaman-halaman tersebut | Field `lsp` tidak diisi; gambar hanya menampilkan nama skema |
| 3 | Skema klaster Cloud, Database, Mobile mengacu **standar ICA11 (Australia)**, bukan SKKNI | Dicatat di field `standard` |
| 4 | Halaman "Manajer Pengelolaan IT" dicocokkan ke "Manajer Pengelola Layanan (ITSM Manager)" berdasarkan kemiripan nama | Ditandai di `note` — perlu konfirmasi |
| 5 | Kode unit sama muncul di dua skema (mis. TIK.JK02.004.01, TIK.SM02.011.01) dengan penulisan judul berbeda | Disalin apa adanya per skema |
| 6 | BNSP (bnsp.go.id) hanya menampilkan tabel nama skema + jumlah unit per LSP, tanpa API | Data dikurasi manual sebagai JSON, bukan diambil otomatis |

## C. Draf pemetaan role → skema

`data/bnsp/role-scheme-map.json` — **status: draft**, semua role `verified: false`.

- **20 role padanan langsung**, **8 parsial** (A2, C2, E5, E7, F1, F2, G1, G2), **6 belum ada skema**: Enterprise Architect (B1), AI Product Designer (B2), Chief AI Officer (C3), DPO (D3), DevOps Engineer (E2), Scrum Master (E3).
- `readyAfterLevel` disusun dengan heuristik: skema *Junior/Pratama/Muda* setelah Lv.1, *Madya*/manajerial setelah Lv.2, *Utama/Full-stack* setelah Lv.3.

**Langkah validasi yang disarankan (DPPP):** cek tiap baris terhadap skema aktif LSP mitra → koreksi `readyAfterLevel`/`priority` → set `verified: true` per role → ubah `status` file menjadi `validated`.
