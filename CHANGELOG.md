# Changelog

## 0.1.0 — 2026-09-26

Rilis awal.

- Katalog Agile Corp NG v5.3 (7 fungsi, 34 role, 67 paket, 124 topik) + validasi otomatis terhadap angka poster.
- Data BNSP: 63 skema bersumber halaman Inixindo Jogja; draf pemetaan role → skema (20 langsung, 8 parsial, 6 belum ada).
- Engine rekomendasi: gap level, track produk, baseline Digital Skill, jadwal per periode, kelas kohort, rekomendasi BNSP, tebak role dari jabatan.
- Gambar learning path perorangan (A4 portrait) & poster instansi (A3 landscape) — PNG dan PDF, dibuat di browser.
- Dashboard instruktur: sesi, peserta, impor Excel/CSV, template Excel berdropdown, rekap Excel, ZIP & PDF gabungan.
- Isi mandiri peserta; mode cloud (Upstash) dengan link/QR sesi, passcode instruktur, rate limit, kedaluwarsa data.
- API integrasi `/api/v1/plan` dan `/api/v1/render` (API key).
- Unit test (Vitest) dan uji end-to-end (Playwright) untuk mode lokal & cloud.
