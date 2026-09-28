// Bentuk JSON ringkas untuk API integrasi (tanpa objek katalog yang besar).
import type { BnspRecommendation, InstitutionPlan, ParticipantPlan } from "@/lib/engine";

function rec(r: BnspRecommendation | undefined, plan: { periods: { label: string }[] }) {
  if (!r) return null;
  return {
    schemeId: r.schemeId,
    name: r.name,
    shortName: r.shortName,
    readiness: r.readiness,
    readyAfterLevel: r.readyAfterLevel,
    afterCode: r.afterCode ?? null,
    period: r.periodIndex !== undefined ? plan.periods[r.periodIndex]?.label ?? null : null,
    unitsCount: r.unitsCount,
    sourceUrls: r.sourceUrls,
  };
}

export function serializeParticipantPlan(plan: ParticipantPlan) {
  const p = plan.participant;
  return {
    participant: { id: p.id, name: p.name, jabatan: p.jabatan, departemen: p.departemen, instansi: p.instansi },
    role: plan.role ? { id: plan.role.id, name: plan.role.name, functionId: plan.role.functionId } : null,
    currentLevel: plan.currentLevel,
    targetLevel: plan.targetLevel,
    steps: plan.steps.map((s) => ({
      kind: s.kind,
      code: s.code,
      level: s.level,
      title: s.title,
      status: s.status,
      track: s.track?.label ?? null,
      trackAuto: s.track?.auto ?? false,
      days: s.days,
      period: s.periodIndex !== undefined ? plan.periods[s.periodIndex]?.label ?? null : null,
      topics: s.topics.map((t) => ({ title: t.title, days: t.days, done: t.done })),
    })),
    bnsp: {
      match: plan.bnsp.match,
      verified: plan.bnsp.verified,
      primary: rec(plan.bnsp.primary, plan),
      alternatives: plan.bnsp.alternatives.map((a) => rec(a, plan)),
      next: rec(plan.bnsp.next, plan),
    },
    totals: plan.totals,
    periods: plan.periods.map((x) => x.label),
    warnings: plan.warnings,
  };
}

export function serializeInstitutionPlan(plan: InstitutionPlan) {
  const names = new Map(plan.plans.map((p) => [p.participant.id, p.participant.name]));
  const label = (i?: number) => (i !== undefined ? plan.periods[i]?.label ?? null : null);
  return {
    kpi: plan.kpi,
    periods: plan.periods.map((p) => p.label),
    cohorts: plan.cohorts.map((c) => ({
      code: c.code,
      title: c.title,
      level: c.level,
      track: c.trackLabel ?? null,
      period: label(c.periodIndex),
      mode: c.mode,
      classCount: c.classCount,
      days: c.days,
      participants: c.participantIds.map((id) => names.get(id) ?? id),
    })),
    roleGroups: plan.roleGroups.map((g) => ({
      roleId: g.roleId,
      roleName: g.roleName,
      participants: g.participantIds.map((id) => names.get(id) ?? id),
      demand: g.demand,
    })),
    bnspRecap: plan.bnspRecap.map((b) => ({
      schemeId: b.schemeId,
      name: b.name,
      period: label(b.periodIndex),
      readiness: b.readiness,
      participants: b.participantIds.map((id) => names.get(id) ?? id),
    })),
    warnings: plan.warnings,
    participants: plan.plans.map(serializeParticipantPlan),
  };
}
