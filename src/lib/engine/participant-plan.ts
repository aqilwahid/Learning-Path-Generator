import { getCatalog, getRole, packageTopics, type Level, type Package, type Role } from "@/lib/catalog";
import { getBnspData, schemeDisplayName } from "@/lib/bnsp";
import type { Participant, PlanSettings } from "@/lib/model/schemas";
import { periodRange } from "./periods";
import type { BnspPlan, BnspRecommendation, ParticipantPlan, PlanStep } from "./types";

export const BASELINE_ROLE_ID = "A3";
export const BASELINE_CODE = "NG-A31";

function chooseTrack(pkg: Package, prefs: string[]): PlanStep["track"] | undefined {
  if (!pkg.tracks) return undefined;
  const preferred = pkg.tracks.find((t) => prefs.includes(t.id));
  const chosen = preferred ?? pkg.tracks[0];
  return {
    id: chosen.id,
    label: chosen.label,
    auto: !preferred && pkg.tracks.length > 1,
    alternatives: pkg.tracks.filter((t) => t.id !== chosen.id).map((t) => t.label),
  };
}

function makeStep(
  pkg: Package,
  kind: PlanStep["kind"],
  status: PlanStep["status"],
  prefs: string[],
  completedTopics: Set<string>,
): PlanStep {
  const track = chooseTrack(pkg, prefs);
  const topics = packageTopics(pkg, track?.id).map((t) => ({
    id: t.id,
    title: t.title,
    days: t.days,
    done: status === "done" || completedTopics.has(t.id),
  }));
  const totalDays = topics.reduce((a, t) => a + t.days, 0);
  const days = status === "done" ? 0 : topics.filter((t) => !t.done).reduce((a, t) => a + t.days, 0);
  return {
    kind,
    roleId: pkg.roleId,
    code: pkg.code,
    level: pkg.level,
    levelName: pkg.levelName,
    title: pkg.title,
    status,
    track,
    topics,
    days,
    totalDays,
  };
}

/**
 * Jadwalkan langkah berstatus planned ke periode.
 * - Baseline boleh berjalan paralel mulai periode pertama.
 * - Paket role berurutan; bila `onePackagePerPeriod`, tiap level di periode berbeda (jeda praktik).
 * - Kapasitas per periode = maxDaysPerMonth × periodMonths.
 */
function schedule(steps: PlanStep[], settings: PlanSettings): void {
  const capacity = settings.maxDaysPerMonth * settings.periodMonths;
  const load: number[] = [];
  let lastRolePeriod = -1;
  for (const step of steps) {
    if (step.status !== "planned") continue;
    let p = step.kind === "role" ? (settings.onePackagePerPeriod ? lastRolePeriod + 1 : Math.max(lastRolePeriod, 0)) : 0;
    while ((load[p] ?? 0) > 0 && (load[p] ?? 0) + step.days > capacity) p++;
    step.periodIndex = p;
    step.overCapacity = step.days > capacity;
    load[p] = (load[p] ?? 0) + step.days;
    if (step.kind === "role") lastRolePeriod = p;
  }
}

function recommendBnsp(role: Role, current: number, target: number, steps: PlanStep[]): BnspPlan {
  const data = getBnspData();
  const mapping = data.mappingByRole.get(role.id);
  if (!mapping) return { match: "unmapped", verified: false, alternatives: [] };
  const periodOfLevel = (level: number) =>
    steps.find((s) => s.kind === "role" && s.level === level && s.status === "planned")?.periodIndex;

  const recs: BnspRecommendation[] = mapping.schemes.map((e) => {
    const scheme = data.schemeById.get(e.schemeId)!;
    const L = e.readyAfterLevel;
    const afterCode = role.packages.find((p) => p.level === L)?.code;
    let readiness: BnspRecommendation["readiness"];
    let periodIndex: number | undefined;
    if (current >= L) {
      readiness = "ready-now";
      periodIndex = 0;
    } else if (target >= L) {
      readiness = "after-path";
      const p = periodOfLevel(L);
      periodIndex = p === undefined ? 0 : p + 1;
    } else {
      readiness = "beyond-target";
    }
    return {
      schemeId: scheme.id,
      name: scheme.name,
      shortName: schemeDisplayName(scheme),
      readyAfterLevel: L,
      readiness,
      afterCode,
      periodIndex,
      priority: e.priority,
      unitsCount: scheme.units?.length ?? 0,
      type: scheme.type,
      standard: scheme.standard,
      trainingDays: scheme.trainingDays,
      assessmentDays: scheme.assessmentDays,
      prerequisites: scheme.prerequisites,
      note: e.note ?? scheme.note,
      sourceUrls: scheme.sourceUrls,
    };
  });

  const byBest = (a: BnspRecommendation, b: BnspRecommendation) =>
    b.readyAfterLevel - a.readyAfterLevel || a.priority - b.priority;
  const reachable = recs.filter((r) => r.readiness !== "beyond-target").sort(byBest);
  const beyond = recs
    .filter((r) => r.readiness === "beyond-target")
    .sort((a, b) => a.readyAfterLevel - b.readyAfterLevel || a.priority - b.priority);

  return {
    match: mapping.match,
    verified: mapping.verified,
    note: mapping.note,
    primary: reachable[0],
    alternatives: reachable.slice(1, 4),
    next: beyond[0],
  };
}

export function buildParticipantPlan(participant: Participant, settings: PlanSettings): ParticipantPlan {
  const catalog = getCatalog();
  const warnings: string[] = [];
  const role = getRole(participant.roleId);
  const prefs = [...participant.trackPrefs, ...settings.defaultTrackPrefs];
  const completedCodes = new Set(participant.completedCodes);
  const completedTopics = new Set(participant.completedTopicIds);

  if (!role) {
    warnings.push("Role target belum dipilih.");
    return {
      participant,
      currentLevel: 0,
      targetLevel: 0,
      maxLevel: 0,
      steps: [],
      bnsp: { match: "unmapped", verified: false, alternatives: [] },
      totals: { remainingDays: 0, doneDays: 0, plannedPackages: 0, plannedTopics: 0, lastPeriodIndex: -1 },
      periods: [],
      warnings,
    };
  }

  const maxLevel = role.maxLevel;
  // level saat ini = level tertinggi berurutan yang sudah diikuti (dari isian level atau paket yang dicentang)
  let current = Math.min(Math.max(participant.currentLevel, 0), maxLevel);
  for (const pkg of role.packages) {
    if (pkg.level === current + 1 && completedCodes.has(pkg.code)) current = pkg.level;
  }
  let target: number;
  if (participant.targetLevel == null) {
    target = Math.min(current + 1, maxLevel);
  } else {
    target = participant.targetLevel;
    if (target > maxLevel) {
      warnings.push(`${role.name} hanya sampai Lv.${maxLevel}; target disesuaikan.`);
      target = maxLevel;
    }
    if (target < current) target = current;
  }

  const steps: PlanStep[] = [];
  const wantBaseline = (participant.includeBaseline || settings.baselineForAll) && role.id !== BASELINE_ROLE_ID;
  if (wantBaseline && !completedCodes.has(BASELINE_CODE)) {
    const base = catalog.packageByCode.get(BASELINE_CODE)!;
    const step = makeStep(base, "baseline", "planned", prefs, completedTopics);
    if (step.days === 0) step.status = "done";
    steps.push(step);
  }

  for (const pkg of role.packages) {
    const status: PlanStep["status"] =
      pkg.level <= current || completedCodes.has(pkg.code) ? "done" : pkg.level <= target ? "planned" : "later";
    const step = makeStep(pkg, "role", status, prefs, completedTopics);
    if (step.status === "planned" && step.days === 0) step.status = "done";
    steps.push(step);
  }

  schedule(steps, settings);

  for (const s of steps) {
    if (s.status === "planned" && s.track?.auto) {
      warnings.push(`Track ${s.track.label} dipilih otomatis untuk ${s.code} (alternatif: ${s.track.alternatives.join(", ")}).`);
    }
    if (s.overCapacity) {
      warnings.push(`${s.code} (${s.days} hari) melebihi kapasitas ${settings.maxDaysPerMonth * settings.periodMonths} hari per periode.`);
    }
  }

  const bnsp: BnspPlan = settings.includeBnsp
    ? recommendBnsp(role, current, target, steps)
    : { match: "disabled", verified: false, alternatives: [] };

  const planned = steps.filter((s) => s.status === "planned");
  if (planned.length === 0) warnings.push("Tidak ada paket yang perlu diikuti pada target ini.");
  const periodIdx = [
    ...planned.map((s) => s.periodIndex ?? 0),
    ...(bnsp.primary?.periodIndex !== undefined ? [bnsp.primary.periodIndex] : []),
  ];
  const lastPeriodIndex = periodIdx.length ? Math.max(...periodIdx) : -1;

  return {
    participant,
    role,
    currentLevel: current,
    targetLevel: target,
    maxLevel,
    steps,
    bnsp,
    totals: {
      remainingDays: planned.reduce((a, s) => a + s.days, 0),
      doneDays: steps.filter((s) => s.status === "done").reduce((a, s) => a + s.totalDays, 0),
      plannedPackages: planned.length,
      plannedTopics: planned.reduce((a, s) => a + s.topics.filter((t) => !t.done).length, 0),
      lastPeriodIndex,
    },
    periods: periodRange(settings, lastPeriodIndex),
    warnings,
  };
}

export function levelChip(level: Level | number): string {
  return `Lv.${level}`;
}
