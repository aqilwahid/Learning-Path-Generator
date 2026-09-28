import { describe, expect, it } from "vitest";
import {
  buildInstitutionPlan,
  buildParticipantPlan,
  emptyParticipant,
  parseRoleCell,
  periodInfo,
  resolveRoleFromTitle,
} from "@/lib/engine";
import { PlanSettingsSchema, type Participant, type PlanSettings } from "@/lib/model/schemas";

const settings = (over: Partial<PlanSettings> = {}): PlanSettings =>
  PlanSettingsSchema.parse({ startMonth: "2026-11", ...over });

const person = (over: Partial<Participant>): Participant => emptyParticipant({ name: "Uji", ...over });

describe("rencana peserta", () => {
  it("Network Engineer Lv.1 → target default Lv.2, uji BNSP setelah NG-G52", () => {
    const plan = buildParticipantPlan(person({ roleId: "G5", currentLevel: 1 }), settings());
    expect(plan.currentLevel).toBe(1);
    expect(plan.targetLevel).toBe(2);
    expect(plan.steps.map((s) => [s.code, s.status, s.periodIndex])).toEqual([
      ["NG-G51", "done", undefined],
      ["NG-G52", "planned", 0],
    ]);
    expect(plan.totals.remainingDays).toBe(3);
    expect(plan.bnsp.primary?.schemeId).toBe("network-administrator-madya");
    expect(plan.bnsp.primary?.readiness).toBe("after-path");
    expect(plan.bnsp.primary?.periodIndex).toBe(1);
    expect(plan.bnsp.alternatives.map((a) => a.schemeId)).toContain("network-administrator-muda");
    expect(plan.bnsp.alternatives.find((a) => a.schemeId === "network-administrator-muda")?.readiness).toBe("ready-now");
    expect(plan.totals.lastPeriodIndex).toBe(1);
  });

  it("Web Apps Developer Lv.0 → Lv.3 dengan preferensi React: satu level per periode", () => {
    const plan = buildParticipantPlan(
      person({ roleId: "E8", currentLevel: 0, targetLevel: 3, trackPrefs: ["reactjs"] }),
      settings(),
    );
    const planned = plan.steps.filter((s) => s.status === "planned");
    expect(planned.map((s) => [s.code, s.periodIndex, s.track?.label ?? null])).toEqual([
      ["NG-E81", 0, null],
      ["NG-E82", 1, "React.js"],
      ["NG-E83", 2, null],
    ]);
    expect(planned[1].track?.auto).toBe(false);
    expect(plan.totals.remainingDays).toBe(11);
    expect(plan.bnsp.primary?.schemeId).toBe("fullstack-developer");
    expect(plan.bnsp.primary?.periodIndex).toBe(3);
    expect(plan.warnings.filter((w) => w.includes("otomatis"))).toHaveLength(0);
  });

  it("tanpa preferensi, track pertama dipilih otomatis dan diberi peringatan", () => {
    const plan = buildParticipantPlan(person({ roleId: "E8", currentLevel: 1 }), settings());
    const e82 = plan.steps.find((s) => s.code === "NG-E82")!;
    expect(e82.track).toMatchObject({ label: "Vue.js", auto: true });
    expect(plan.warnings.some((w) => w.includes("dipilih otomatis"))).toBe(true);
  });

  it("preferensi default dari pengaturan sesi dipakai bila peserta tidak memilih", () => {
    const plan = buildParticipantPlan(person({ roleId: "G6", currentLevel: 0 }), settings({ defaultTrackPrefs: ["mongodb"] }));
    const g61 = plan.steps.find((s) => s.code === "NG-G61")!;
    expect(g61.track?.label).toBe("MongoDB");
    expect(g61.days).toBe(5);
  });

  it("baseline Digital Skill berjalan paralel di periode pertama bila kapasitas cukup", () => {
    const plan = buildParticipantPlan(person({ roleId: "G5", currentLevel: 0, includeBaseline: true }), settings());
    const planned = plan.steps.filter((s) => s.status === "planned");
    expect(planned.map((s) => [s.kind, s.code, s.periodIndex])).toEqual([
      ["baseline", "NG-A31", 0],
      ["role", "NG-G51", 0],
    ]);
    expect(plan.totals.remainingDays).toBe(12);
  });

  it("baseline tidak ditambahkan untuk role Digital Skill sendiri", () => {
    const plan = buildParticipantPlan(person({ roleId: "A3", currentLevel: 0 }), settings({ baselineForAll: true }));
    expect(plan.steps.filter((s) => s.kind === "baseline")).toHaveLength(0);
  });

  it("paket yang melebihi kapasitas ditandai dan tetap dijadwalkan berurutan", () => {
    const plan = buildParticipantPlan(
      person({ roleId: "E2", currentLevel: 0, targetLevel: 4 }),
      settings({ maxDaysPerMonth: 1 }),
    );
    const planned = plan.steps.filter((s) => s.status === "planned");
    expect(planned.map((s) => [s.code, s.periodIndex, Boolean(s.overCapacity)])).toEqual([
      ["NG-E21", 0, false],
      ["NG-E22", 1, true],
      ["NG-E23", 2, true],
      ["NG-E24", 3, true],
    ]);
    expect(plan.warnings.some((w) => w.includes("melebihi kapasitas"))).toBe(true);
  });

  it("mode padat: beberapa level boleh di periode yang sama bila kapasitas cukup", () => {
    const plan = buildParticipantPlan(
      person({ roleId: "G5", currentLevel: 0, targetLevel: 2 }),
      settings({ onePackagePerPeriod: false }),
    );
    expect(plan.steps.map((s) => s.periodIndex)).toEqual([0, 0]);
  });

  it("topik yang sudah diikuti mengurangi sisa hari", () => {
    const plan = buildParticipantPlan(
      person({ roleId: "E10", currentLevel: 1, completedTopicIds: ["NG-E102#main#1"] }),
      settings(),
    );
    const e102 = plan.steps.find((s) => s.code === "NG-E102")!;
    expect(e102.days).toBe(7);
    expect(e102.totalDays).toBe(9);
    expect(e102.topics[0].done).toBe(true);
  });

  it("paket yang dicentang menaikkan level saat ini", () => {
    const plan = buildParticipantPlan(person({ roleId: "G5", completedCodes: ["NG-G51"] }), settings());
    expect(plan.currentLevel).toBe(1);
    expect(plan.targetLevel).toBe(2);
  });

  it("target melebihi level tertinggi role disesuaikan", () => {
    const plan = buildParticipantPlan(person({ roleId: "C5", targetLevel: 3 }), settings());
    expect(plan.targetLevel).toBe(1);
    expect(plan.warnings.some((w) => w.includes("hanya sampai Lv.1"))).toBe(true);
  });

  it("role kosong menghasilkan rencana kosong dengan peringatan", () => {
    const plan = buildParticipantPlan(person({ roleId: null }), settings());
    expect(plan.steps).toHaveLength(0);
    expect(plan.warnings[0]).toContain("Role target belum dipilih");
  });

  it("role tanpa skema BNSP ditandai 'none'", () => {
    const plan = buildParticipantPlan(person({ roleId: "E2" }), settings());
    expect(plan.bnsp.match).toBe("none");
    expect(plan.bnsp.primary).toBeUndefined();
  });

  it("skema di atas target muncul sebagai 'berikutnya'", () => {
    const plan = buildParticipantPlan(person({ roleId: "E4", currentLevel: 0 }), settings());
    expect(plan.bnsp.primary).toBeUndefined();
    expect(plan.bnsp.next?.schemeId).toBe("it-quality-assurance");
    expect(plan.bnsp.next?.readiness).toBe("beyond-target");
  });

  it("BNSP bisa dimatikan lewat pengaturan", () => {
    const plan = buildParticipantPlan(person({ roleId: "G5" }), settings({ includeBnsp: false }));
    expect(plan.bnsp.match).toBe("disabled");
  });
});

describe("rencana instansi", () => {
  const people: Participant[] = [
    person({ id: "w1", roleId: "E8", trackPrefs: ["reactjs"], currentLevel: 1 }),
    person({ id: "w2", roleId: "E8", trackPrefs: ["reactjs"], currentLevel: 1 }),
    person({ id: "w3", roleId: "E8", trackPrefs: ["reactjs"], currentLevel: 1 }),
    person({ id: "w4", roleId: "E8", trackPrefs: ["laravel"], currentLevel: 1 }),
    person({ id: "w5", roleId: "E8", trackPrefs: ["laravel"], currentLevel: 1 }),
    person({ id: "n1", roleId: "G5", currentLevel: 0 }),
    person({ id: "x1", roleId: null }),
  ];
  const inst = buildInstitutionPlan(people, settings({ inHouseMin: 3 }));

  it("menggabungkan peserta ke kelas kohort per paket, track, dan periode", () => {
    const summary = inst.cohorts.map((c) => [c.code, c.trackLabel ?? null, c.periodIndex, c.participantIds.length, c.mode]);
    expect(summary).toEqual([
      ["NG-E82", "React.js", 0, 3, "in-house"],
      ["NG-E82", "Laravel", 0, 2, "reguler"],
      ["NG-G51", null, 0, 1, "reguler"],
    ]);
  });

  it("KPI dihitung dengan benar", () => {
    expect(inst.kpi).toMatchObject({ participants: 7, roles: 2, packages: 3, classes: 3, inHouseClasses: 1, regulerClasses: 2 });
    expect(inst.kpi.personDays).toBe(5 * 4 + 3);
    expect(inst.warnings.some((w) => w.includes("belum punya role"))).toBe(true);
  });

  it("kelompok role terurut per fungsi, peserta tanpa role di akhir", () => {
    expect(inst.roleGroups.map((g) => g.roleId)).toEqual(["E8", "G5", null]);
    expect(inst.roleGroups[0].demand).toEqual([
      { code: "NG-E82", level: 2, trackLabel: "React.js", count: 3 },
      { code: "NG-E82", level: 2, trackLabel: "Laravel", count: 2 },
    ]);
  });

  it("kelas dipecah bila melebihi kapasitas", () => {
    const many = Array.from({ length: 45 }, (_, i) => person({ id: `m${i}`, roleId: "G7" }));
    const plan = buildInstitutionPlan(many, settings({ maxClassSize: 20 }));
    expect(plan.cohorts[0].classCount).toBe(3);
  });

  it("rekap BNSP mengelompokkan skema utama per periode", () => {
    const e82 = inst.bnspRecap.find((r) => r.schemeId === "web-developer");
    expect(e82?.participantIds).toHaveLength(5);
    expect(e82?.periodIndex).toBe(1);
  });
});

describe("pemetaan jabatan", () => {
  it.each([
    ["Staf Jaringan Bidang TIK", "G5", "strong"],
    ["Pranata Komputer - Admin Jaringan", "G5", "strong"],
    ["Kepala Bidang TIK", "C1", "strong"],
    ["Web Apps Developer", "E8", "exact"],
    ["DevOps Engineer", "E2", "exact"],
    ["Programmer", "E8", "weak"],
    ["Analis Data", "E10", "strong"],
    ["Helpdesk / Service Desk", "G7", "strong"],
  ])("%s → %s (%s)", (title, roleId, confidence) => {
    expect(resolveRoleFromTitle(title)).toMatchObject({ roleId, confidence });
  });

  it("jabatan ambigu tidak dipetakan otomatis", () => {
    expect(resolveRoleFromTitle("Pranata Komputer Ahli Muda").confidence).toBe("ambiguous");
  });

  it("teks kosong atau tak dikenal → none", () => {
    expect(resolveRoleFromTitle("").confidence).toBe("none");
    expect(resolveRoleFromTitle("Juru Masak").confidence).toBe("none");
  });

  it.each([
    ["E8 · Web Apps Developer", "E8"],
    ["e10", "E10"],
    ["E1 - System Analyst", "E1"],
    ["E10 - Data Scientist", "E10"],
    ["Network Engineer", "G5"],
    ["Z9", null],
  ])("kolom role '%s' → %s", (cell, roleId) => {
    expect(parseRoleCell(cell)).toBe(roleId);
  });
});

describe("periode", () => {
  it("label periode triwulan melintasi tahun", () => {
    expect(periodInfo({ startMonth: "2026-11", periodMonths: 3 }, 0).label).toBe("Nov 2026–Jan 2027");
    expect(periodInfo({ startMonth: "2026-11", periodMonths: 3 }, 1).label).toBe("Feb–Apr 2027");
    expect(periodInfo({ startMonth: "2026-11", periodMonths: 1 }, 2).label).toBe("Jan 2027");
  });
});
