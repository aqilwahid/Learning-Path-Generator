// Impor daftar peserta dari Excel (.xlsx) atau CSV — termasuk rekap Google Form.
import { getCatalog } from "@/lib/catalog";
import { emptyParticipant, parseRoleCell, resolveRoleFromTitle, type RoleMatchConfidence } from "@/lib/engine";
import { normalizeText } from "@/lib/engine/resolve-role";
import type { Participant } from "@/lib/model/schemas";
import { mapHeaders, type FieldKey } from "./columns";

export const MAX_IMPORT_ROWS = 500;

export interface ImportRow {
  rowNumber: number;
  participant: Participant;
  roleSource: "kolom" | "jabatan" | "kosong";
  roleConfidence?: RoleMatchConfidence;
  issues: string[];
}

export interface ImportResult {
  rows: ImportRow[];
  headerRow: number;
  mapped: Partial<Record<FieldKey, number>>;
  warnings: string[];
}

const TRACK_ALIASES: Record<string, string> = {
  vue: "vuejs", vuejs: "vuejs", "vue js": "vuejs",
  react: "reactjs", reactjs: "reactjs", "react js": "reactjs",
  laravel: "laravel", django: "django",
  mikrotik: "mikrotik", linux: "linux",
  vmware: "vmware", proxmox: "proxmox-ve", "proxmox ve": "proxmox-ve",
  aws: "aws", "amazon web services": "aws", gcp: "gcp", "google cloud": "gcp",
  oracle: "oracle-db", "oracle db": "oracle-db", "oracle database": "oracle-db",
  mongo: "mongodb", mongodb: "mongodb", "mongo db": "mongodb",
};

export function parseTracks(value: string): string[] {
  const out = new Set<string>();
  for (const part of value.split(/[,;/|]+/)) {
    const n = normalizeText(part);
    if (!n) continue;
    const id = TRACK_ALIASES[n] ?? TRACK_ALIASES[n.replace(/\s+/g, "")];
    if (id) out.add(id);
  }
  return [...out];
}

export function parseLevel(value: string, allowZero = true): number | null {
  const v = normalizeText(value);
  if (!v || v.startsWith("otomatis") || v === "auto") return null;
  const m = v.match(/\d/);
  if (m) {
    const n = Number(m[0]);
    if (n >= (allowZero ? 0 : 1) && n <= 4) return n;
  }
  if (v.includes("belum")) return 0;
  if (v.includes("foundation") || v.includes("dasar")) return 1;
  if (v.includes("intermediate") || v.includes("menengah")) return 2;
  if (v.includes("advanced") || v.includes("advance") || v.includes("mahir")) return 3;
  if (v.includes("expert") || v.includes("ahli")) return 4;
  return null;
}

export function parseYes(value: string): boolean {
  return /^(ya|y|yes|true|1|v|x|iya|benar)$/i.test(value.trim()) || value.includes("✓");
}

export function parseCodes(value: string): string[] {
  const catalog = getCatalog();
  const found = value.toUpperCase().match(/NG-[A-G]\d{2,3}/g) ?? [];
  return [...new Set(found)].filter((c) => catalog.packageByCode.has(c));
}

function cell(row: string[], idx: number | undefined): string {
  if (idx === undefined) return "";
  return String(row[idx] ?? "").trim();
}

/** Ubah tabel (baris × kolom) menjadi peserta. Baris header dicari di 10 baris pertama. */
export function rowsToParticipants(table: string[][], defaults: { instansi?: string } = {}): ImportResult {
  const warnings: string[] = [];
  let headerRow = -1;
  let mapped: Partial<Record<FieldKey, number>> = {};
  for (let i = 0; i < Math.min(10, table.length); i++) {
    const m = mapHeaders(table[i]);
    if (m.name !== undefined) {
      headerRow = i;
      mapped = m;
      break;
    }
  }
  if (headerRow < 0) {
    return { rows: [], headerRow: -1, mapped: {}, warnings: ["Kolom 'Nama' tidak ditemukan. Pakai template Excel dari aplikasi atau pastikan ada kolom Nama."] };
  }
  if (mapped.role === undefined && mapped.jabatan === undefined) {
    warnings.push("Tidak ada kolom Role Target maupun Jabatan — role harus dipilih manual.");
  }

  const rows: ImportRow[] = [];
  for (let i = headerRow + 1; i < table.length; i++) {
    const r = table[i];
    const name = cell(r, mapped.name);
    if (!name) continue;
    if (rows.length >= MAX_IMPORT_ROWS) {
      warnings.push(`Hanya ${MAX_IMPORT_ROWS} baris pertama yang diimpor.`);
      break;
    }
    const issues: string[] = [];
    const jabatan = cell(r, mapped.jabatan);
    let roleId = parseRoleCell(cell(r, mapped.role));
    let roleSource: ImportRow["roleSource"] = roleId ? "kolom" : "kosong";
    let roleConfidence: RoleMatchConfidence | undefined;
    if (!roleId && cell(r, mapped.role)) issues.push(`Role "${cell(r, mapped.role)}" tidak dikenali.`);
    if (!roleId && jabatan) {
      const guess = resolveRoleFromTitle(jabatan);
      roleConfidence = guess.confidence;
      if (guess.roleId && (guess.confidence === "exact" || guess.confidence === "strong" || guess.confidence === "weak")) {
        roleId = guess.roleId;
        roleSource = "jabatan";
        if (guess.confidence === "weak") issues.push("Role ditebak dari jabatan (kurang yakin) — mohon dicek.");
      } else if (guess.confidence === "ambiguous") {
        issues.push("Jabatan ambigu — pilih role secara manual.");
      }
    }
    if (!roleId) issues.push("Role target belum ditentukan.");

    const currentRaw = cell(r, mapped.currentLevel);
    const currentLevel = currentRaw ? parseLevel(currentRaw) : 0;
    if (currentRaw && currentLevel === null) issues.push(`Level saat ini "${currentRaw}" tidak dikenali (dianggap 0).`);
    const targetRaw = cell(r, mapped.targetLevel);
    const targetLevel = targetRaw ? parseLevel(targetRaw, false) : null;

    const participant = emptyParticipant({
      name: name.slice(0, 120),
      jabatan: jabatan.slice(0, 160),
      departemen: cell(r, mapped.departemen).slice(0, 160),
      instansi: (cell(r, mapped.instansi) || defaults.instansi || "").slice(0, 160),
      roleId,
      currentLevel: currentLevel ?? 0,
      targetLevel,
      trackPrefs: parseTracks(cell(r, mapped.tracks)),
      completedCodes: parseCodes(cell(r, mapped.completed)),
      includeBaseline: parseYes(cell(r, mapped.baseline)),
      certifications: cell(r, mapped.certifications).slice(0, 300),
      notes: cell(r, mapped.notes).slice(0, 500),
      source: "import",
    });
    rows.push({ rowNumber: i + 1, participant, roleSource, roleConfidence, issues });
  }
  if (!rows.length) warnings.push("Tidak ada baris peserta yang terbaca.");
  return { rows, headerRow: headerRow + 1, mapped, warnings };
}

// ---------- pembaca file ----------

function cellText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") {
    const o = v as { text?: string; richText?: { text: string }[]; result?: unknown; hyperlink?: string };
    if (Array.isArray(o.richText)) return o.richText.map((t) => t.text).join("");
    if (typeof o.text === "string") return o.text;
    if (o.result !== undefined) return String(o.result);
    if (v instanceof Date) return v.toISOString().slice(0, 10);
  }
  return String(v);
}

export async function readXlsx(buffer: ArrayBuffer): Promise<string[][]> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.getWorksheet("Peserta") ?? wb.worksheets.find((w) => w.state !== "hidden" && w.name !== "Petunjuk") ?? wb.worksheets[0];
  if (!ws) return [];
  const table: string[][] = [];
  ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const values = row.values as unknown[];
    const arr: string[] = [];
    for (let c = 1; c < values.length; c++) arr[c - 1] = cellText(values[c]);
    table[rowNumber - 1] = arr;
  });
  return Array.from(table, (r) => r ?? []);
}

export async function readCsv(text: string): Promise<string[][]> {
  const Papa = (await import("papaparse")).default;
  const res = Papa.parse<string[]>(text.replace(/^﻿/, ""), { skipEmptyLines: "greedy" });
  return res.data;
}

export async function importParticipantsFile(file: File, defaults: { instansi?: string } = {}): Promise<ImportResult> {
  const name = file.name.toLowerCase();
  if (file.size > 5 * 1024 * 1024) throw new Error("File terlalu besar (maks. 5 MB).");
  let table: string[][];
  if (name.endsWith(".csv") || file.type === "text/csv") table = await readCsv(await file.text());
  else if (name.endsWith(".xlsx")) table = await readXlsx(await file.arrayBuffer());
  else throw new Error("Format belum didukung. Gunakan .xlsx atau .csv (Google Form → unduh CSV/XLSX).");
  return rowsToParticipants(table, defaults);
}
