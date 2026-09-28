import type { PlanSettings } from "@/lib/model/schemas";

export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export const MONTHS_LONG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export interface PeriodInfo {
  index: number;
  /** "Okt–Des 2026", "Nov 2026–Jan 2027", atau "Okt 2026" untuk periode 1 bulan */
  label: string;
  /** "P1", "P2", ... */
  shortLabel: string;
  start: string;
  end: string;
}

function parseYm(ym: string): { y: number; m: number } {
  const [y, m] = ym.split("-").map(Number);
  return { y, m };
}

export function addMonths(ym: string, n: number): string {
  const { y, m } = parseYm(ym);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

export function monthLabel(ym: string, long = false): string {
  const { y, m } = parseYm(ym);
  return `${(long ? MONTHS_LONG : MONTHS_SHORT)[m - 1]} ${y}`;
}

/** Bulan depan dari tanggal acuan (format YYYY-MM). */
export function defaultStartMonth(now: Date = new Date()): string {
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return addMonths(ym, 1);
}

export function periodInfo(settings: Pick<PlanSettings, "startMonth" | "periodMonths">, index: number): PeriodInfo {
  const start = addMonths(settings.startMonth, index * settings.periodMonths);
  const end = addMonths(start, settings.periodMonths - 1);
  let label: string;
  if (settings.periodMonths === 1) {
    label = monthLabel(start);
  } else {
    const s = parseYm(start);
    const e = parseYm(end);
    label =
      s.y === e.y
        ? `${MONTHS_SHORT[s.m - 1]}–${MONTHS_SHORT[e.m - 1]} ${e.y}`
        : `${MONTHS_SHORT[s.m - 1]} ${s.y}–${MONTHS_SHORT[e.m - 1]} ${e.y}`;
  }
  return { index, label, shortLabel: `P${index + 1}`, start, end };
}

export function periodRange(settings: Pick<PlanSettings, "startMonth" | "periodMonths">, lastIndex: number): PeriodInfo[] {
  return Array.from({ length: Math.max(0, lastIndex + 1) }, (_, i) => periodInfo(settings, i));
}

export function formatDateId(d: Date = new Date()): string {
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}
