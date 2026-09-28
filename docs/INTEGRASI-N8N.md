# Integrasi (n8n / sistem lain)

Aktifkan dengan mengisi `GENERATOR_API_KEY`. Kirim kunci lewat header `x-api-key: <kunci>` atau `Authorization: Bearer <kunci>`.
Tanpa env tersebut, kedua endpoint mengembalikan 404.

## `POST /api/v1/plan` → JSON rencana

```json
{
  "participants": [
    { "name": "Rina Pratiwi", "jabatan": "Staf Jaringan", "departemen": "Bidang TIK", "roleId": "G5", "currentLevel": 1 },
    { "name": "Andi Saputra", "roleId": "E8", "targetLevel": 3, "trackPrefs": ["reactjs"] }
  ],
  "settings": { "startMonth": "2027-01", "periodMonths": 3, "inHouseMin": 5 }
}
```

Field peserta mengikuti skema di `src/lib/model/schemas.ts` (`name` wajib; lainnya opsional). Respons memuat `kpi`, `cohorts`, `roleGroups`, `bnspRecap`, dan `participants[]` (langkah, periode, skema BNSP, peringatan).

## `POST /api/v1/render` → gambar

Perorangan (PNG 2480×3508):

```json
{ "kind": "individual", "format": "png",
  "participant": { "name": "Rina Pratiwi", "jabatan": "Staf Jaringan", "roleId": "G5", "currentLevel": 1 },
  "settings": { "startMonth": "2027-01" },
  "sessionTitle": "TNA Bidang TIK 2027" }
```

Poster instansi (PNG 3720×2631):

```json
{ "kind": "institution", "format": "png",
  "participants": [ … ],
  "meta": { "title": "TNA Bidang TIK 2027", "instansi": "Dinas Kominfo Kab. Contoh" } }
```

`format: "svg"` mengembalikan SVG (vektor).

## Contoh alur n8n: Google Form → gambar → Telegram

1. **Google Sheets Trigger** — baris baru dari rekap Google Form.
2. **Code** — petakan kolom ke `{ name, jabatan, departemen, roleId, currentLevel }`. `roleId` bisa dikosongkan lalu diisi dari kolom pilihan role di form (format `G5 · Network Engineer` → ambil 2–3 karakter pertama).
3. **HTTP Request** — Method `POST`, URL `https://<domain>/api/v1/render`, Body JSON seperti contoh di atas, Header `x-api-key` dari credential n8n (**jangan** menulis kunci di field teks), Response Format **File**.
4. **Telegram → Send Photo** — Binary Property `data` → kirim gambar ke peserta/instruktur.

Untuk rekap kelas otomatis, panggil `/api/v1/plan` dari schedule trigger dan tulis `cohorts` ke Google Sheets.

## Batasan

- Maks. 500 peserta per permintaan, body maks. 2 MB.
- Render di server memakai resvg native (Vercel Node runtime). Poster instansi ±0,5 detik, perorangan ±0,3 detik.
