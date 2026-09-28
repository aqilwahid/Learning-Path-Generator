/* Data contoh FIKTIF untuk demo & tes render. Nama dan instansi bukan orang/lembaga nyata. */
import { emptyParticipant } from "@/lib/engine";
import { PlanSettingsSchema, type Participant, type PlanSettings } from "@/lib/model/schemas";

export const SAMPLE_INSTANSI = "Dinas Komunikasi dan Informatika Kabupaten Contoh";
export const SAMPLE_SESSION_TITLE = "TNA Bidang TIK 2026/2027";

export const sampleSettings: PlanSettings = PlanSettingsSchema.parse({
  startMonth: "2026-11",
  periodMonths: 3,
  maxDaysPerMonth: 5,
  inHouseMin: 3,
});

const base = { instansi: SAMPLE_INSTANSI };

export const sampleParticipants: Participant[] = [
  emptyParticipant({ ...base, id: "s01", name: "Rina Pratiwi", jabatan: "Staf Jaringan", departemen: "Bidang Infrastruktur TIK", roleId: "G5", currentLevel: 1 }),
  emptyParticipant({ ...base, id: "s02", name: "Andi Saputra", jabatan: "Programmer", departemen: "Bidang Aplikasi Informatika", roleId: "E8", currentLevel: 0, targetLevel: 3, trackPrefs: ["reactjs"] }),
  emptyParticipant({ ...base, id: "s03", name: "Dewi Lestari", jabatan: "Programmer", departemen: "Bidang Aplikasi Informatika", roleId: "E8", currentLevel: 1, trackPrefs: ["reactjs"] }),
  emptyParticipant({ ...base, id: "s04", name: "Bagus Wicaksono", jabatan: "Programmer", departemen: "Bidang Aplikasi Informatika", roleId: "E8", currentLevel: 1, trackPrefs: ["laravel"] }),
  emptyParticipant({ ...base, id: "s05", name: "Siti Nurhaliza Rahmawati", jabatan: "Pranata Komputer Ahli Muda", departemen: "Bidang Aplikasi Informatika", roleId: "E8", currentLevel: 1, trackPrefs: ["reactjs"] }),
  emptyParticipant({ ...base, id: "s06", name: "Yoga Pramudya", jabatan: "Admin Server", departemen: "Bidang Infrastruktur TIK", roleId: "G8", currentLevel: 0, includeBaseline: true }),
  emptyParticipant({ ...base, id: "s07", name: "Fajar Nugroho", jabatan: "Analis Keamanan Informasi", departemen: "Bidang Persandian", roleId: "C5", currentLevel: 0 }),
  emptyParticipant({ ...base, id: "s08", name: "Maya Anggraini", jabatan: "Analis Data", departemen: "Bidang Statistik", roleId: "E10", currentLevel: 1, completedTopicIds: ["NG-E102#main#1"] }),
  emptyParticipant({ ...base, id: "s09", name: "Hendra Kurniawan", jabatan: "Kepala Bidang TIK", departemen: "Sekretariat", roleId: "C1", currentLevel: 0, targetLevel: 2 }),
  emptyParticipant({ ...base, id: "s10", name: "Putri Ayu Maharani", jabatan: "Staf Jaringan", departemen: "Bidang Infrastruktur TIK", roleId: "G5", currentLevel: 0 }),
  emptyParticipant({ ...base, id: "s11", name: "Rizky Ramadhan", jabatan: "Admin Jaringan", departemen: "Bidang Infrastruktur TIK", roleId: "G5", currentLevel: 0 }),
  emptyParticipant({ ...base, id: "s12", name: "Galih Prasetyo", jabatan: "DevOps Engineer", departemen: "Bidang Aplikasi Informatika", roleId: "E2", currentLevel: 0, targetLevel: 4, includeBaseline: true }),
];

const FIRST = ["Adi", "Budi", "Citra", "Dian", "Eka", "Fitri", "Gilang", "Hana", "Indra", "Joko", "Kartika", "Lukman", "Mega", "Nanda", "Oki", "Prita", "Rudi", "Sari", "Taufik", "Umi"];
const LAST = ["Santoso", "Wijaya", "Hidayat", "Permata", "Susanto", "Rahayu", "Setiawan", "Kusuma", "Purnomo", "Utami"];

/** 60 peserta fiktif lintas 16 role — untuk menguji pemotongan konten poster instansi. */
export function largeSample(): Participant[] {
  const roles = ["G5", "G5", "G5", "E8", "E8", "E8", "E8", "G7", "G7", "G8", "C1", "C4", "C5", "D1", "D2", "E10", "E10", "F3", "G4", "G6", "E9", "A3", "A3", "B1", "E2"];
  return Array.from({ length: 60 }, (_, i) =>
    emptyParticipant({
      ...base,
      id: `L${i}`,
      name: `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`,
      roleId: roles[i % roles.length],
      currentLevel: i % 3 === 0 ? 1 : 0,
      trackPrefs: i % 2 ? ["reactjs", "aws", "oracle-db"] : ["laravel", "gcp", "mongodb"],
    }),
  );
}

/** Kasus ekstrem untuk menguji kepadatan tata letak gambar perorangan. */
export const denseParticipant: Participant = emptyParticipant({
  ...base,
  id: "dense",
  name: "Muhammad Ikhsan Nur Fadhillah Kusumawardhana",
  jabatan: "Pranata Komputer Ahli Pertama",
  departemen: "Bidang Aplikasi Informatika dan Persandian",
  roleId: "E7",
  currentLevel: 0,
  targetLevel: 4,
  includeBaseline: true,
});
