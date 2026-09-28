import { z } from "zod";

/** Skema data peserta, pengaturan rencana, dan sesi — dipakai UI, impor, dan API. */

export const ROLE_ID_RE = /^[A-G]\d{1,2}$/;
export const PACKAGE_CODE_RE = /^NG-[A-G]\d{2,3}$/;
export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export const ParticipantSourceSchema = z.enum(["instruktur", "peserta", "import"]);

export const ParticipantSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1, "Nama wajib diisi").max(120),
  jabatan: z.string().trim().max(160).default(""),
  departemen: z.string().trim().max(160).default(""),
  instansi: z.string().trim().max(160).default(""),
  roleId: z.string().regex(ROLE_ID_RE).nullable().default(null),
  currentLevel: z.number().int().min(0).max(4).default(0),
  targetLevel: z.number().int().min(1).max(4).nullable().default(null),
  completedCodes: z.array(z.string().regex(PACKAGE_CODE_RE)).max(80).default([]),
  completedTopicIds: z.array(z.string().max(48)).max(200).default([]),
  trackPrefs: z.array(z.string().regex(/^[a-z0-9-]+$/)).max(20).default([]),
  includeBaseline: z.boolean().default(false),
  certifications: z.string().trim().max(300).default(""),
  notes: z.string().trim().max(500).default(""),
  source: ParticipantSourceSchema.default("instruktur"),
  createdAt: z.string().max(40).optional(),
  updatedAt: z.string().max(40).optional(),
});

export type Participant = z.infer<typeof ParticipantSchema>;
export type ParticipantInput = z.input<typeof ParticipantSchema>;

export const PERIOD_MONTH_OPTIONS = [1, 2, 3, 6] as const;

export const PlanSettingsSchema = z.object({
  startMonth: z.string().regex(MONTH_RE, "Format bulan YYYY-MM"),
  periodMonths: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(6)]).default(3),
  maxDaysPerMonth: z.number().int().min(1).max(20).default(5),
  onePackagePerPeriod: z.boolean().default(true),
  inHouseMin: z.number().int().min(1).max(200).default(5),
  maxClassSize: z.number().int().min(1).max(200).default(20),
  includeBnsp: z.boolean().default(true),
  baselineForAll: z.boolean().default(false),
  defaultTrackPrefs: z.array(z.string().regex(/^[a-z0-9-]+$/)).max(20).default([]),
});

export type PlanSettings = z.infer<typeof PlanSettingsSchema>;

export const SessionSchema = z.object({
  id: z.string().min(1).max(64),
  code: z.string().min(4).max(12),
  title: z.string().trim().min(1, "Judul sesi wajib diisi").max(160),
  instansi: z.string().trim().max(160).default(""),
  departemen: z.string().trim().max(160).default(""),
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string().optional(),
  open: z.boolean().default(true),
  settings: PlanSettingsSchema,
  participants: z.array(ParticipantSchema).max(1000).default([]),
});

export type Session = z.infer<typeof SessionSchema>;

/** Isian mandiri peserta lewat link sesi (tanpa id/sumber; id dibuat server). */
export const SelfSubmissionSchema = ParticipantSchema.omit({
  id: true,
  source: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  /** honeypot anti-bot: harus kosong */
  website: z.string().max(0).optional().default(""),
});

export type SelfSubmission = z.infer<typeof SelfSubmissionSchema>;
