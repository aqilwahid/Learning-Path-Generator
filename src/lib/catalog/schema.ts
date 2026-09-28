import { z } from "zod";

/** Skema validasi file katalog (data/catalog/*.json). */

export const LevelSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
export type Level = z.infer<typeof LevelSchema>;

export const FunctionIdSchema = z.enum(["A", "B", "C", "D", "E", "F", "G"]);
export type FunctionId = z.infer<typeof FunctionIdSchema>;

const RawTopicSchema = z.object({
  title: z.string().min(1),
  days: z.number().int().positive(),
});

const RawTrackSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "id track harus slug huruf kecil"),
  label: z.string().min(1),
  original: z.string().optional(),
  topics: z.array(RawTopicSchema).min(1),
});

const RawPackageSchema = z
  .object({
    code: z.string().regex(/^NG-[A-G]\d{2,3}$/, "kode paket harus berpola NG-{fungsi}{role}{level}"),
    level: LevelSchema,
    title: z.string().min(1),
    original: z
      .object({
        title: z.string().optional(),
        levelLabel: z.string().optional(),
        note: z.string().optional(),
      })
      .optional(),
    topics: z.array(RawTopicSchema).min(1).optional(),
    tracks: z.array(RawTrackSchema).min(1).optional(),
  })
  .refine((p) => Boolean(p.topics) !== Boolean(p.tracks), {
    message: "Paket harus punya `topics` ATAU `tracks` (tidak keduanya).",
  });

const RawRoleSchema = z.object({
  id: z.string().regex(/^[A-G]\d{1,2}$/),
  functionId: FunctionIdSchema,
  number: z.number().int().positive(),
  name: z.string().min(1),
  abbr: z.string().optional(),
  description: z.string().optional(),
  crossCutting: z.boolean().optional(),
  packages: z.array(RawPackageSchema).min(1),
});

export const RawCatalogSchema = z.object({
  id: z.string(),
  title: z.string(),
  program: z.string(),
  version: z.string(),
  year: z.number().int(),
  source: z.object({ file: z.string(), note: z.string().optional() }),
  layers: z.array(z.object({ id: z.enum(["strategic", "implementation"]), name: z.string() })),
  functions: z.array(
    z.object({
      id: FunctionIdSchema,
      name: z.string(),
      label: z.string(),
      layer: z.enum(["strategic", "implementation"]),
    }),
  ),
  roles: z.array(RawRoleSchema).min(1),
});

export type RawCatalog = z.infer<typeof RawCatalogSchema>;
export type RawRole = z.infer<typeof RawRoleSchema>;
export type RawPackage = z.infer<typeof RawPackageSchema>;
