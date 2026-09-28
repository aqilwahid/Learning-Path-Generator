import { getRole, type Level } from "@/lib/catalog";
import type { Participant, PlanSettings } from "@/lib/model/schemas";
import { buildParticipantPlan } from "./participant-plan";
import { periodRange } from "./periods";
import type { BnspRecapItem, CohortClass, InstitutionPlan, RoleGroup } from "./types";

/**
 * Rencana instansi/departemen: gabungan rencana per peserta + kelas kohort + rekap BNSP.
 * Kohort = peserta dengan paket, track, dan periode yang sama.
 */
export function buildInstitutionPlan(participants: Participant[], settings: PlanSettings): InstitutionPlan {
  const plans = participants.map((p) => buildParticipantPlan(p, settings));
  const warnings: string[] = [];

  // --- kohort kelas
  const cohortMap = new Map<string, CohortClass>();
  for (const plan of plans) {
    for (const step of plan.steps) {
      if (step.status !== "planned" || step.periodIndex === undefined) continue;
      const key = `${step.code}|${step.track?.id ?? "-"}|${step.periodIndex}`;
      let c = cohortMap.get(key);
      if (!c) {
        c = {
          key,
          kind: step.kind,
          roleId: step.roleId,
          code: step.code,
          title: step.title,
          level: step.level,
          trackId: step.track?.id,
          trackLabel: step.track?.label,
          periodIndex: step.periodIndex,
          participantIds: [],
          classCount: 0,
          mode: "reguler",
          days: step.totalDays,
        };
        cohortMap.set(key, c);
      }
      c.participantIds.push(plan.participant.id);
    }
  }
  const cohorts = [...cohortMap.values()]
    .map((c) => {
      const n = c.participantIds.length;
      return {
        ...c,
        classCount: Math.max(1, Math.ceil(n / settings.maxClassSize)),
        mode: n >= settings.inHouseMin ? ("in-house" as const) : ("reguler" as const),
      };
    })
    .sort(
      (a, b) =>
        a.periodIndex - b.periodIndex ||
        a.code.localeCompare(b.code, "id", { numeric: true }) ||
        b.participantIds.length - a.participantIds.length ||
        (a.trackLabel ?? "").localeCompare(b.trackLabel ?? ""),
    );

  // --- kelompok per role
  const groupMap = new Map<string, RoleGroup>();
  for (const plan of plans) {
    const key = plan.role?.id ?? "__none__";
    let g = groupMap.get(key);
    if (!g) {
      g = {
        roleId: plan.role?.id ?? null,
        roleName: plan.role?.name ?? "Belum dipetakan",
        functionId: plan.role?.functionId ?? null,
        participantIds: [],
        demand: [],
      };
      groupMap.set(key, g);
    }
    g.participantIds.push(plan.participant.id);
    for (const step of plan.steps) {
      if (step.status !== "planned" || step.kind !== "role") continue;
      const d = g.demand.find((x) => x.code === step.code && x.trackLabel === step.track?.label);
      if (d) d.count++;
      else g.demand.push({ code: step.code, level: step.level as Level, trackLabel: step.track?.label, count: 1 });
    }
  }
  const roleGroups = [...groupMap.values()].sort((a, b) => {
    if (!a.roleId) return 1;
    if (!b.roleId) return -1;
    const ra = getRole(a.roleId)!;
    const rb = getRole(b.roleId)!;
    return ra.functionId.localeCompare(rb.functionId) || ra.number - rb.number;
  });
  for (const g of roleGroups) g.demand.sort((a, b) => a.level - b.level || a.code.localeCompare(b.code));

  // --- rekap BNSP (skema utama per peserta)
  const recapMap = new Map<string, BnspRecapItem>();
  for (const plan of plans) {
    const r = plan.bnsp.primary;
    if (!r) continue;
    const key = `${r.schemeId}|${r.periodIndex ?? "-"}`;
    const item = recapMap.get(key) ?? {
      schemeId: r.schemeId,
      name: r.shortName,
      periodIndex: r.periodIndex,
      readiness: r.readiness,
      participantIds: [],
    };
    item.participantIds.push(plan.participant.id);
    recapMap.set(key, item);
  }
  const bnspRecap = [...recapMap.values()].sort(
    (a, b) => b.participantIds.length - a.participantIds.length || (a.periodIndex ?? 99) - (b.periodIndex ?? 99) || a.name.localeCompare(b.name),
  );

  const unmapped = plans.filter((p) => !p.role).length;
  if (unmapped) warnings.push(`${unmapped} peserta belum punya role target.`);
  const autoTracks = plans.filter((p) => p.steps.some((s) => s.status === "planned" && s.track?.auto)).length;
  if (autoTracks) warnings.push(`${autoTracks} peserta memakai track yang dipilih otomatis — cek profil teknologi.`);

  const lastPeriodIndex = Math.max(-1, ...plans.map((p) => p.totals.lastPeriodIndex));
  const inHouse = cohorts.filter((c) => c.mode === "in-house").reduce((a, c) => a + c.classCount, 0);
  const reguler = cohorts.filter((c) => c.mode === "reguler").reduce((a, c) => a + c.classCount, 0);

  return {
    settings,
    periods: periodRange(settings, lastPeriodIndex),
    plans,
    cohorts,
    roleGroups,
    bnspRecap,
    kpi: {
      participants: plans.length,
      roles: new Set(plans.filter((p) => p.role).map((p) => p.role!.id)).size,
      packages: cohorts.length,
      personDays: plans.reduce((a, p) => a + p.totals.remainingDays, 0),
      classes: inHouse + reguler,
      inHouseClasses: inHouse,
      regulerClasses: reguler,
      bnspCandidates: plans.filter((p) => p.bnsp.primary).length,
      lastPeriodIndex,
    },
    warnings,
  };
}
