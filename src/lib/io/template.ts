// Template Excel peserta dengan dropdown (role, level, teknologi) + lembar petunjuk.
import type { Workbook, Worksheet } from "exceljs";
import { getCatalog, getFunction, LEVEL_NAMES } from "@/lib/catalog";
import { COLUMNS } from "./columns";

const NAVY = "FF04294B";
const RED = "FFC00000";
const SKY = "FFCEDDEA";
export const TEMPLATE_ROWS = 500;

export const LEVEL_OPTIONS = ["0 - Belum pernah", "1 - Foundation", "2 - Intermediate", "3 - Advanced", "4 - Expert"];
export const TARGET_OPTIONS = ["Otomatis (+1 level)", "1 - Foundation", "2 - Intermediate", "3 - Advanced", "4 - Expert"];

function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function styleHeader(ws: Worksheet, row = 1): void {
  const r = ws.getRow(row);
  r.height = 30;
  r.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    c.alignment = { vertical: "middle", wrapText: true };
    c.border = { bottom: { style: "thin", color: { argb: RED } } };
  });
}

export async function buildTemplateWorkbook(opts: { sessionTitle?: string; instansi?: string } = {}): Promise<Workbook> {
  const ExcelJS = (await import("exceljs")).default;
  const catalog = getCatalog();
  const wb = new ExcelJS.Workbook();
  wb.creator = "NG Learning Path";
  wb.created = new Date();

  // --- lembar referensi (tersembunyi) untuk dropdown
  const ref = wb.addWorksheet("Ref");
  const roleLabels = catalog.roles.map((r) => r.label);
  const tracks = catalog.trackOptions.map((t) => t.label);
  ref.getColumn(1).values = ["Role", ...roleLabels];
  ref.getColumn(2).values = ["Level", ...LEVEL_OPTIONS];
  ref.getColumn(3).values = ["Target", ...TARGET_OPTIONS];
  ref.getColumn(4).values = ["Teknologi", ...tracks];
  ref.getColumn(5).values = ["YaTidak", "Ya", "Tidak"];

  // --- lembar data peserta
  const ws = wb.addWorksheet("Peserta", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = COLUMNS.map((c) => ({ header: c.required ? `${c.header}*` : c.header, key: c.key, width: c.width }));
  styleHeader(ws);
  COLUMNS.forEach((c, i) => {
    ws.getCell(1, i + 1).note = c.help;
  });
  const idx = (key: string) => COLUMNS.findIndex((c) => c.key === key) + 1;
  const range = (key: string) => {
    const L = colLetter(idx(key));
    return `${L}2:${L}${TEMPLATE_ROWS + 1}`;
  };
  const list = (formula: string, strict: boolean, prompt: string) => ({
    type: "list" as const,
    allowBlank: true,
    formulae: [formula],
    showInputMessage: true,
    promptTitle: "Petunjuk",
    prompt,
    showErrorMessage: true,
    errorStyle: strict ? ("stop" as const) : ("information" as const),
    errorTitle: "Nilai tidak ada di daftar",
    error: strict ? "Pilih dari daftar." : "Nilai di luar daftar tetap diterima.",
  });
  const dv = (ws as Worksheet & { dataValidations: { add(range: string, validation: unknown): void } }).dataValidations;
  dv.add(range("role"), list(`Ref!$A$2:$A$${roleLabels.length + 1}`, true, "Pilih role target dari katalog Agile Corp NG."));
  dv.add(range("currentLevel"), list(`Ref!$B$2:$B$${LEVEL_OPTIONS.length + 1}`, true, "Level paket NG tertinggi yang sudah diikuti untuk role ini."));
  dv.add(range("targetLevel"), list(`Ref!$C$2:$C$${TARGET_OPTIONS.length + 1}`, true, "Kosongkan untuk otomatis naik 1 level."));
  dv.add(range("tracks"), list(`Ref!$D$2:$D$${tracks.length + 1}`, false, "Boleh lebih dari satu, pisahkan dengan koma."));
  dv.add(range("baseline"), list(`Ref!$E$2:$E$3`, true, "Ya untuk menambahkan Digital Skill Foundation."));
  ref.state = "veryHidden";

  // --- lembar petunjuk
  const help = wb.addWorksheet("Petunjuk");
  help.columns = [{ width: 26 }, { width: 44 }, { width: 14 }, { width: 70 }];
  help.addRow([`Template Peserta — ${catalog.program} (katalog v${catalog.version})`]).font = { bold: true, size: 14, color: { argb: NAVY } };
  if (opts.sessionTitle || opts.instansi) help.addRow([[opts.sessionTitle, opts.instansi].filter(Boolean).join(" · ")]);
  help.addRow([]);
  help.addRow(["Cara mengisi"]).font = { bold: true, color: { argb: RED } };
  [
    "1. Isi satu baris per peserta di lembar 'Peserta'. Kolom bertanda * wajib (Role boleh kosong bila Jabatan diisi — role akan ditebak).",
    "2. Pilih Role Target, Level Saat Ini, dan Target Level dari dropdown.",
    "3. Kolom Teknologi hanya berpengaruh untuk paket yang punya varian produk (lihat tabel di bawah).",
    "4. Simpan sebagai .xlsx lalu unggah di menu Instruktur → Impor Excel/CSV.",
    "Rekap Google Form juga bisa diimpor: pastikan ada kolom Nama, lalu Jabatan/Role.",
  ].forEach((t) => help.addRow([t]));
  help.addRow([]);
  help.addRow(["Level", "Arti"]).font = { bold: true };
  help.addRow(["0", "Belum pernah mengikuti paket untuk role ini"]);
  ([1, 2, 3, 4] as const).forEach((l) => help.addRow([String(l), `${LEVEL_NAMES[l]} — paket Lv.${l} sudah diikuti`]));
  help.addRow([]);
  const hdr = help.addRow(["Role", "Nama & fungsi", "Level maks.", "Deskripsi"]);
  hdr.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  });
  for (const r of catalog.roles) {
    const row = help.addRow([r.label, `${getFunction(r.functionId).label}`, `Lv.${r.maxLevel}`, r.description ?? ""]);
    row.alignment = { wrapText: true, vertical: "top" };
  }
  help.addRow([]);
  const th = help.addRow(["Teknologi", "Dipakai di paket"]);
  th.eachCell((c) => {
    c.font = { bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SKY } };
  });
  for (const t of catalog.trackOptions) help.addRow([t.label, t.packageCodes.join(", ")]);

  wb.views = [{ x: 0, y: 0, width: 20000, height: 12000, firstSheet: 0, activeTab: 1, visibility: "visible" }];
  return wb;
}

export async function workbookToBlob(wb: Workbook): Promise<Blob> {
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
