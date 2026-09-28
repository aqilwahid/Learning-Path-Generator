import rawCatalogJson from "@data/catalog/agile-corp-ng-2025_v5.3.json";
import { RawCatalogSchema, type FunctionId, type Level, type RawCatalog } from "./schema";

export type { FunctionId, Level } from "./schema";

export const LEVEL_NAMES: Record<Level, string> = {
  1: "Foundation",
  2: "Intermediate",
  3: "Advanced",
  4: "Expert",
};

export interface Topic {
  /** ID stabil: `{kode}#{track|main}#{urutan}` — dipakai untuk menandai topik yang sudah diikuti. */
  id: string;
  title: string;
  days: number;
  index: number;
}

export interface Track {
  id: string;
  label: string;
  original?: string;
  topics: Topic[];
  days: number;
}

export interface Package {
  code: string;
  roleId: string;
  level: Level;
  levelName: string;
  title: string;
  original?: { title?: string; levelLabel?: string; note?: string };
  /** Terisi bila paket tidak punya varian produk. */
  topics?: Topic[];
  /** Terisi bila paket punya "Product Specifics" (pilih satu track). */
  tracks?: Track[];
  daysMin: number;
  daysMax: number;
}

export interface Role {
  id: string;
  functionId: FunctionId;
  number: number;
  name: string;
  abbr?: string;
  description?: string;
  crossCutting: boolean;
  packages: Package[];
  maxLevel: Level;
  /** Contoh: "E8 · Web Apps Developer" */
  label: string;
}

export interface CatalogFunction {
  id: FunctionId;
  name: string;
  label: string;
  layer: "strategic" | "implementation";
}

export interface TrackOption {
  id: string;
  label: string;
  /** Paket-paket yang memakai track ini. */
  packageCodes: string[];
}

export interface Catalog {
  id: string;
  title: string;
  program: string;
  version: string;
  year: number;
  sourceFile: string;
  functions: CatalogFunction[];
  roles: Role[];
  roleById: Map<string, Role>;
  packageByCode: Map<string, Package>;
  topicById: Map<string, Topic & { packageCode: string; trackId?: string }>;
  trackOptions: TrackOption[];
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function buildCatalog(raw: RawCatalog): Catalog {
  const roleById = new Map<string, Role>();
  const packageByCode = new Map<string, Package>();
  const topicById: Catalog["topicById"] = new Map();
  const trackMap = new Map<string, TrackOption>();

  const roles: Role[] = raw.roles.map((r) => {
    const packages: Package[] = [...r.packages]
      .sort((a, b) => a.level - b.level)
      .map((p) => {
        const mkTopics = (list: { title: string; days: number }[], trackId?: string): Topic[] =>
          list.map((t, i) => {
            const topic: Topic = {
              id: `${p.code}#${trackId ?? "main"}#${i + 1}`,
              title: t.title.replace(/\s+/g, " ").trim(),
              days: t.days,
              index: i,
            };
            topicById.set(topic.id, { ...topic, packageCode: p.code, trackId });
            return topic;
          });

        let topics: Topic[] | undefined;
        let tracks: Track[] | undefined;
        if (p.topics) topics = mkTopics(p.topics);
        if (p.tracks) {
          tracks = p.tracks.map((t) => {
            const tt = mkTopics(t.topics, t.id);
            const opt = trackMap.get(t.id) ?? { id: t.id, label: t.label, packageCodes: [] };
            opt.packageCodes.push(p.code);
            trackMap.set(t.id, opt);
            return { id: t.id, label: t.label, original: t.original, topics: tt, days: sum(tt.map((x) => x.days)) };
          });
        }
        const variants = topics ? [sum(topics.map((t) => t.days))] : tracks!.map((t) => t.days);
        const pkg: Package = {
          code: p.code,
          roleId: r.id,
          level: p.level,
          levelName: LEVEL_NAMES[p.level],
          title: p.title,
          original: p.original,
          topics,
          tracks,
          daysMin: Math.min(...variants),
          daysMax: Math.max(...variants),
        };
        packageByCode.set(pkg.code, pkg);
        return pkg;
      });

    const role: Role = {
      id: r.id,
      functionId: r.functionId,
      number: r.number,
      name: r.name,
      abbr: r.abbr,
      description: r.description,
      crossCutting: Boolean(r.crossCutting),
      packages,
      maxLevel: packages[packages.length - 1].level,
      label: `${r.id} · ${r.name}`,
    };
    roleById.set(role.id, role);
    return role;
  });

  return {
    id: raw.id,
    title: raw.title,
    program: raw.program,
    version: raw.version,
    year: raw.year,
    sourceFile: raw.source.file,
    functions: raw.functions,
    roles,
    roleById,
    packageByCode,
    topicById,
    trackOptions: [...trackMap.values()],
  };
}

let cached: Catalog | null = null;

/** Katalog aktif (divalidasi dengan Zod saat pertama kali dimuat). */
export function getCatalog(): Catalog {
  if (!cached) cached = buildCatalog(RawCatalogSchema.parse(rawCatalogJson));
  return cached;
}

export function getRole(roleId: string | undefined | null): Role | undefined {
  if (!roleId) return undefined;
  return getCatalog().roleById.get(roleId);
}

export function getPackage(code: string): Package | undefined {
  return getCatalog().packageByCode.get(code);
}

export function getFunction(id: FunctionId): CatalogFunction {
  const f = getCatalog().functions.find((x) => x.id === id);
  if (!f) throw new Error(`Fungsi ${id} tidak ada di katalog`);
  return f;
}

/** Topik sebuah paket untuk track tertentu (atau topik utama bila paket tanpa track). */
export function packageTopics(pkg: Package, trackId?: string | null): Topic[] {
  if (pkg.topics) return pkg.topics;
  const track = pkg.tracks!.find((t) => t.id === trackId) ?? pkg.tracks![0];
  return track.topics;
}

export function levelName(level: number): string {
  return LEVEL_NAMES[level as Level] ?? `Lv.${level}`;
}
