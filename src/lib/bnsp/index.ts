import { z } from "zod";
import schemesJson from "@data/bnsp/schemes.json";
import mapJson from "@data/bnsp/role-scheme-map.json";

const UnitSchema = z.object({ code: z.string().min(1), title: z.string().min(1) });

const SchemeSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  shortName: z.string().optional(),
  fullName: z.string().optional(),
  type: z.enum(["klaster", "okupasi", "kkni"]).optional(),
  standard: z.string().optional(),
  units: z.array(UnitSchema).optional(),
  trainingDays: z.number().int().positive().optional(),
  assessmentDays: z.number().int().positive().optional(),
  durationText: z.string().optional(),
  prerequisites: z.string().optional(),
  assessmentMethods: z.string().optional(),
  note: z.string().optional(),
  sourceIds: z.array(z.string()).min(1),
});

const SchemesFileSchema = z.object({
  updatedAt: z.string(),
  provider: z.string(),
  note: z.string().optional(),
  sources: z.array(z.object({ id: z.string(), title: z.string(), url: z.string().url(), accessed: z.string() })),
  schemes: z.array(SchemeSchema),
});

const MappingSchema = z.object({
  roleId: z.string().regex(/^[A-G]\d{1,2}$/),
  match: z.enum(["direct", "partial", "none"]),
  verified: z.boolean(),
  note: z.string().optional(),
  schemes: z.array(
    z.object({
      schemeId: z.string(),
      readyAfterLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
      priority: z.number().int().min(1),
      note: z.string().optional(),
    }),
  ),
});

const MapFileSchema = z.object({
  updatedAt: z.string(),
  status: z.enum(["draft", "validated"]),
  note: z.string().optional(),
  mappings: z.array(MappingSchema),
});

export type BnspScheme = z.infer<typeof SchemeSchema> & { sourceUrls: string[] };
export type RoleSchemeMapping = z.infer<typeof MappingSchema>;
export type BnspMatch = RoleSchemeMapping["match"];

export interface BnspData {
  updatedAt: string;
  provider: string;
  mapStatus: "draft" | "validated";
  mapNote?: string;
  schemes: BnspScheme[];
  schemeById: Map<string, BnspScheme>;
  mappingByRole: Map<string, RoleSchemeMapping>;
  sources: z.infer<typeof SchemesFileSchema>["sources"];
}

export function buildBnspData(schemesRaw: unknown, mapRaw: unknown): BnspData {
  const s = SchemesFileSchema.parse(schemesRaw);
  const m = MapFileSchema.parse(mapRaw);
  const sourceUrl = new Map(s.sources.map((x) => [x.id, x.url]));
  const schemes: BnspScheme[] = s.schemes.map((sc) => ({
    ...sc,
    sourceUrls: sc.sourceIds.map((id) => {
      const url = sourceUrl.get(id);
      if (!url) throw new Error(`Sumber '${id}' pada skema '${sc.id}' tidak terdaftar`);
      return url;
    }),
  }));
  const schemeById = new Map(schemes.map((x) => [x.id, x]));
  for (const mp of m.mappings) {
    for (const e of mp.schemes) {
      if (!schemeById.has(e.schemeId)) throw new Error(`Skema '${e.schemeId}' (role ${mp.roleId}) tidak ada di schemes.json`);
    }
  }
  return {
    updatedAt: s.updatedAt,
    provider: s.provider,
    mapStatus: m.status,
    mapNote: m.note,
    schemes,
    schemeById,
    mappingByRole: new Map(m.mappings.map((x) => [x.roleId, x])),
    sources: s.sources,
  };
}

let cached: BnspData | null = null;

export function getBnspData(): BnspData {
  if (!cached) cached = buildBnspData(schemesJson, mapJson);
  return cached;
}

export function schemeDisplayName(s: BnspScheme): string {
  return s.shortName ?? s.name;
}
