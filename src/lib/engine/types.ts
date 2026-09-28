import type { Level, Role } from "@/lib/catalog";
import type { BnspMatch } from "@/lib/bnsp";
import type { Participant, PlanSettings } from "@/lib/model/schemas";
import type { PeriodInfo } from "./periods";

export type StepStatus = "done" | "planned" | "later";
export type StepKind = "baseline" | "role";

export interface PlanTopic {
  id: string;
  title: string;
  days: number;
  done: boolean;
}

export interface PlanStep {
  kind: StepKind;
  roleId: string;
  code: string;
  level: Level;
  levelName: string;
  title: string;
  status: StepStatus;
  track?: {
    id: string;
    label: string;
    /** true bila dipilih otomatis (tidak ada preferensi yang cocok) padahal ada alternatif */
    auto: boolean;
    alternatives: string[];
  };
  topics: PlanTopic[];
  /** Sisa hari (topik yang belum diikuti). */
  days: number;
  /** Total hari paket untuk track terpilih. */
  totalDays: number;
  periodIndex?: number;
  overCapacity?: boolean;
}

export type BnspReadiness = "ready-now" | "after-path" | "beyond-target";

export interface BnspRecommendation {
  schemeId: string;
  name: string;
  shortName: string;
  readyAfterLevel: Level;
  readiness: BnspReadiness;
  /** Paket yang harus selesai sebelum uji (untuk after-path / beyond-target). */
  afterCode?: string;
  /** Periode uji yang disarankan. */
  periodIndex?: number;
  priority: number;
  unitsCount: number;
  type?: string;
  standard?: string;
  trainingDays?: number;
  assessmentDays?: number;
  prerequisites?: string;
  note?: string;
  sourceUrls: string[];
}

export interface BnspPlan {
  match: BnspMatch | "unmapped" | "disabled";
  verified: boolean;
  note?: string;
  primary?: BnspRecommendation;
  alternatives: BnspRecommendation[];
  /** Skema berikutnya bila target level dinaikkan. */
  next?: BnspRecommendation;
}

export interface ParticipantPlan {
  participant: Participant;
  role?: Role;
  currentLevel: number;
  targetLevel: number;
  maxLevel: number;
  steps: PlanStep[];
  bnsp: BnspPlan;
  totals: {
    remainingDays: number;
    doneDays: number;
    plannedPackages: number;
    plannedTopics: number;
    /** Indeks periode terakhir (termasuk jadwal uji BNSP); -1 bila tidak ada rencana. */
    lastPeriodIndex: number;
  };
  periods: PeriodInfo[];
  warnings: string[];
}

export interface CohortClass {
  key: string;
  kind: StepKind;
  roleId: string;
  code: string;
  title: string;
  level: Level;
  trackId?: string;
  trackLabel?: string;
  periodIndex: number;
  participantIds: string[];
  classCount: number;
  mode: "in-house" | "reguler";
  days: number;
}

export interface RoleGroup {
  roleId: string | null;
  roleName: string;
  functionId: string | null;
  participantIds: string[];
  demand: { code: string; level: Level; trackLabel?: string; count: number }[];
}

export interface BnspRecapItem {
  schemeId: string;
  name: string;
  periodIndex?: number;
  readiness: BnspReadiness;
  participantIds: string[];
}

export interface InstitutionPlan {
  settings: PlanSettings;
  periods: PeriodInfo[];
  plans: ParticipantPlan[];
  cohorts: CohortClass[];
  roleGroups: RoleGroup[];
  bnspRecap: BnspRecapItem[];
  kpi: {
    participants: number;
    roles: number;
    packages: number;
    personDays: number;
    classes: number;
    inHouseClasses: number;
    regulerClasses: number;
    bnspCandidates: number;
    lastPeriodIndex: number;
  };
  warnings: string[];
}
