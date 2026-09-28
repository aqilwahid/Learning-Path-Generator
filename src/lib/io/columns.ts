// Definisi kolom template & sinonim header (termasuk header umum dari Google Form).
import { normalizeText } from "@/lib/engine/resolve-role";

export type FieldKey =
  | "name"
  | "jabatan"
  | "departemen"
  | "instansi"
  | "role"
  | "currentLevel"
  | "targetLevel"
  | "tracks"
  | "completed"
  | "baseline"
  | "certifications"
  | "notes";

export interface ColumnDef {
  key: FieldKey;
  header: string;
  width: number;
  required?: boolean;
  synonyms: string[];
  help: string;
}

export const COLUMNS: ColumnDef[] = [
  { key: "name", header: "Nama", width: 30, required: true, synonyms: ["nama", "nama lengkap", "nama peserta", "name", "full name", "nama lengkap dan gelar"], help: "Nama lengkap peserta (wajib)." },
  { key: "jabatan", header: "Jabatan", width: 28, synonyms: ["jabatan", "posisi", "position", "job title", "jabatan saat ini", "jabatan fungsional"], help: "Jabatan saat ini. Dipakai untuk menebak role bila kolom Role kosong." },
  { key: "departemen", header: "Departemen/Unit", width: 28, synonyms: ["departemen unit", "departemen", "unit kerja", "unit", "bagian", "divisi", "bidang", "department", "satuan kerja"], help: "Departemen, bidang, atau unit kerja." },
  { key: "instansi", header: "Instansi", width: 30, synonyms: ["instansi", "perusahaan", "organisasi", "company", "institution", "opd", "nama instansi", "asal instansi"], help: "Nama instansi/perusahaan. Boleh dikosongkan bila sama dengan sesi." },
  { key: "role", header: "Role Target", width: 34, required: true, synonyms: ["role target", "role", "job role", "peran", "okupasi", "target role"], help: "Pilih dari daftar (mis. 'G5 · Network Engineer'). Bila kosong, role ditebak dari jabatan." },
  { key: "currentLevel", header: "Level Saat Ini", width: 22, synonyms: ["level saat ini", "level sekarang", "current level", "level"], help: "0 = belum pernah; 1–4 = level paket NG tertinggi yang sudah diikuti untuk role ini." },
  { key: "targetLevel", header: "Target Level", width: 22, synonyms: ["target level", "level target", "target"], help: "Kosong/Otomatis = naik 1 level. Isi 1–4 untuk target tertentu." },
  { key: "tracks", header: "Teknologi (opsional)", width: 26, synonyms: ["teknologi", "preferensi teknologi", "track", "stack", "teknologi yang digunakan", "platform"], help: "Untuk paket bervarian: Vue.js, React.js, Laravel, Django, Mikrotik, Linux, VMware, Proxmox VE, AWS, GCP, Oracle DB, MongoDB. Pisahkan dengan koma." },
  { key: "completed", header: "Paket Sudah Diikuti", width: 26, synonyms: ["paket sudah diikuti", "paket selesai", "pelatihan yang sudah diikuti", "sudah diikuti", "riwayat pelatihan"], help: "Kode paket NG yang sudah diikuti, pisahkan dengan koma (mis. NG-G51, NG-A31)." },
  { key: "baseline", header: "Baseline Digital Skill", width: 20, synonyms: ["baseline digital skill", "baseline", "digital skill"], help: "Ya = tambahkan NG-A31 Digital Skill Foundation (untuk peserta non-IT)." },
  { key: "certifications", header: "Sertifikat Dimiliki", width: 28, synonyms: ["sertifikat dimiliki", "sertifikat", "sertifikasi", "sertifikasi dimiliki"], help: "Sertifikat yang sudah dimiliki (teks bebas)." },
  { key: "notes", header: "Catatan", width: 30, synonyms: ["catatan", "keterangan", "notes", "catatan instruktur"], help: "Catatan tambahan — muncul di gambar peserta." },
];

/** Petakan baris header ke indeks kolom. Header dicocokkan dengan sinonim terpanjang. */
export function mapHeaders(headers: string[]): Partial<Record<FieldKey, number>> {
  const out: Partial<Record<FieldKey, number>> = {};
  const scores: Partial<Record<FieldKey, number>> = {};
  headers.forEach((h, idx) => {
    const norm = normalizeText(String(h ?? "").replace(/\*/g, ""));
    if (!norm) return;
    let best: { key: FieldKey; score: number } | null = null;
    for (const col of COLUMNS) {
      for (const syn of col.synonyms) {
        const s = normalizeText(syn);
        let score = 0;
        if (norm === s) score = 1000 + s.length;
        else if (norm.startsWith(`${s} `) || norm.endsWith(` ${s}`) || norm.includes(` ${s} `)) score = s.length;
        if (score > (best?.score ?? 0)) best = { key: col.key, score };
      }
    }
    if (best && best.score > (scores[best.key] ?? 0)) {
      out[best.key] = idx;
      scores[best.key] = best.score;
    }
  });
  return out;
}
