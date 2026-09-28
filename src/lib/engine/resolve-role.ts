import aliases from "@data/aliases/job-titles.json";
import { getCatalog } from "@/lib/catalog";

export type RoleMatchConfidence = "exact" | "strong" | "weak" | "ambiguous" | "none";

export interface RoleMatch {
  roleId: string | null;
  confidence: RoleMatchConfidence;
  keyword?: string;
}

interface Candidate {
  roleId: string;
  phrase: string;
  score: number;
  confidence: "exact" | "strong" | "weak";
}

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

let candidates: Candidate[] | null = null;
let ambiguous: string[] | null = null;

function getCandidates(): Candidate[] {
  if (candidates) return candidates;
  const list: Candidate[] = [];
  for (const role of getCatalog().roles) {
    const name = normalizeText(role.name);
    list.push({ roleId: role.id, phrase: name, score: 1000 + name.length, confidence: "exact" });
    if (role.abbr && role.abbr.length >= 3) {
      const abbr = normalizeText(role.abbr);
      list.push({ roleId: role.id, phrase: abbr, score: 500 + abbr.length, confidence: "strong" });
    }
  }
  for (const rule of aliases.rules as { roleId: string; keywords: string[]; weak?: string[] }[]) {
    for (const kw of rule.keywords) {
      const p = normalizeText(kw);
      list.push({ roleId: rule.roleId, phrase: p, score: p.length, confidence: "strong" });
    }
    for (const kw of rule.weak ?? []) {
      const p = normalizeText(kw);
      // kata kunci lemah selalu kalah dari kata kunci kuat yang sama panjang
      list.push({ roleId: rule.roleId, phrase: p, score: p.length - 0.5, confidence: "weak" });
    }
  }
  candidates = list;
  return list;
}

function getAmbiguous(): string[] {
  if (!ambiguous) ambiguous = (aliases.ambiguous as string[]).map(normalizeText);
  return ambiguous;
}

/**
 * Tebak role dari teks jabatan bebas, mis. "Staf Jaringan Bidang TIK" → G5 (Network Engineer).
 * Kata kunci terpanjang menang. Jabatan ambigu (mis. "Pranata Komputer") tanpa kata kunci kuat → ambiguous.
 */
export function resolveRoleFromTitle(title: string | null | undefined): RoleMatch {
  const norm = normalizeText(title ?? "");
  if (!norm) return { roleId: null, confidence: "none" };
  const padded = ` ${norm} `;
  let best: Candidate | null = null;
  for (const c of getCandidates()) {
    if (!c.phrase) continue;
    if (padded.includes(` ${c.phrase} `) && (!best || c.score > best.score)) best = c;
  }
  const isAmbiguous = getAmbiguous().some((a) => padded.includes(` ${a} `));
  if (best && best.confidence !== "weak") return { roleId: best.roleId, confidence: best.confidence, keyword: best.phrase };
  if (isAmbiguous) return { roleId: best?.roleId ?? null, confidence: "ambiguous", keyword: best?.phrase };
  if (best) return { roleId: best.roleId, confidence: "weak", keyword: best.phrase };
  return { roleId: null, confidence: "none" };
}

/**
 * Baca isi kolom "Role" dari Excel/CSV: menerima "E8", "E8 · Web Apps Developer",
 * "E8 - Web Apps Developer", atau nama role saja.
 */
export function parseRoleCell(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  const catalog = getCatalog();
  const m = v.match(/^([A-Ga-g]\d{1,2})(?![0-9])/);
  if (m) {
    const id = m[1].toUpperCase();
    if (catalog.roleById.has(id)) return id;
  }
  const norm = normalizeText(v);
  const byName = catalog.roles.find((r) => normalizeText(r.name) === norm);
  if (byName) return byName.id;
  const guess = resolveRoleFromTitle(v);
  return guess.confidence === "exact" || guess.confidence === "strong" ? guess.roleId : null;
}
