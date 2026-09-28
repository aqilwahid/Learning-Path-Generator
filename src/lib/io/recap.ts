// Rekap Excel hasil rencana instansi (ringkasan, peserta, kelas, BNSP).
import type { Workbook, Worksheet } from "exceljs";
import type { InstitutionPlan } from "@/lib/engine";

const NAVY = "FF04294B";

function header(ws: Worksheet, labels: string[], widths: number[]): void {
  ws.columns = labels.map((h, i) => ({ header: h, width: widths[i] ?? 18 }));
  const r = ws.getRow(1);
  r.height = 24;
  r.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    c.alignment = { vertical: "middle", wrapText: true };
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

export async function buildRecapWorkbook(
  meta: { title: string; instansi?: string; departemen?: string },
  plan: InstitutionPlan,
): Promise<Workbook> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "NG Learning Path";
  const period = (i?: number) => (i !== undefined ? plan.periods[i]?.label ?? "" : "");
  const names = new Map(plan.plans.map((p) => [p.participant.id, p.participant.name]));

  const sum = wb.addWorksheet("Ringkasan");
  sum.columns = [{ width: 34 }, { width: 60 }];
  sum.addRow([meta.title]).font = { bold: true, size: 14, color: { argb: NAVY } };
  sum.addRow([[meta.instansi, meta.departemen].filter(Boolean).join(" · ")]);
  sum.addRow([]);
  const k = plan.kpi;
  const rows: [string, string | number][] = [
    ["Peserta", k.participants],
    ["Role target", k.roles],
    ["Paket kelas (kohort)", k.packages],
    ["Total hari-orang", k.personDays],
    ["Jumlah kelas", `${k.classes} (${k.inHouseClasses} in-house, ${k.regulerClasses} reguler)`],
    ["Calon uji BNSP", k.bnspCandidates],
    ["Periode", plan.periods.map((p) => p.label).join(" | ")],
    ["Aturan in-house", `min. ${plan.settings.inHouseMin} peserta; maks. ${plan.settings.maxClassSize} per kelas`],
  ];
  rows.forEach(([a, b]) => {
    const r = sum.addRow([a, b]);
    r.getCell(1).font = { bold: true };
  });
  if (plan.warnings.length) {
    sum.addRow([]);
    sum.addRow(["Catatan"]).font = { bold: true };
    plan.warnings.forEach((w) => sum.addRow(["", w]));
  }

  const ps = wb.addWorksheet("Peserta");
  header(
    ps,
    ["No", "Nama", "Jabatan", "Departemen/Unit", "Instansi", "Role target", "Level", "Paket rencana", "Sisa hari", "Periode selesai", "Skema BNSP utama", "Periode uji", "Status pemetaan", "Peringatan"],
    [6, 28, 24, 24, 26, 26, 12, 34, 10, 20, 30, 18, 16, 50],
  );
  plan.plans.forEach((p, i) => {
    const planned = p.steps.filter((s) => s.status === "planned");
    ps.addRow([
      i + 1,
      p.participant.name,
      p.participant.jabatan,
      p.participant.departemen,
      p.participant.instansi,
      p.role ? p.role.label : "(belum dipilih)",
      p.role ? `Lv.${p.currentLevel} → Lv.${p.targetLevel}` : "",
      planned.map((s) => (s.track ? `${s.code} (${s.track.label})` : s.code)).join(", "),
      p.totals.remainingDays,
      p.totals.lastPeriodIndex >= 0 ? period(p.totals.lastPeriodIndex) : "",
      p.bnsp.primary?.shortName ?? (p.bnsp.match === "none" ? "Belum ada skema" : ""),
      period(p.bnsp.primary?.periodIndex),
      p.bnsp.primary ? (p.bnsp.verified ? "Tervalidasi" : "Draf") : "",
      p.warnings.join(" | "),
    ]);
  });

  const cs = wb.addWorksheet("Kelas");
  header(cs, ["Periode", "Kode", "Paket", "Track", "Hari", "Jumlah peserta", "Mode", "Jumlah kelas", "Peserta"], [20, 10, 36, 14, 8, 14, 12, 12, 80]);
  plan.cohorts.forEach((c) => {
    const r = cs.addRow([
      period(c.periodIndex),
      c.code,
      c.title,
      c.trackLabel ?? "",
      c.days,
      c.participantIds.length,
      c.mode === "in-house" ? "In-house" : "Reguler",
      c.classCount,
      c.participantIds.map((id) => names.get(id) ?? id).join(", "),
    ]);
    r.alignment = { wrapText: true, vertical: "top" };
  });

  const bs = wb.addWorksheet("BNSP");
  header(bs, ["Skema", "Periode uji", "Kesiapan", "Jumlah", "Peserta"], [36, 20, 16, 10, 80]);
  plan.bnspRecap.forEach((b) => {
    const r = bs.addRow([
      b.name,
      period(b.periodIndex),
      b.readiness === "ready-now" ? "Siap sekarang" : "Setelah jalur",
      b.participantIds.length,
      b.participantIds.map((id) => names.get(id) ?? id).join(", "),
    ]);
    r.alignment = { wrapText: true, vertical: "top" };
  });
  return wb;
}
