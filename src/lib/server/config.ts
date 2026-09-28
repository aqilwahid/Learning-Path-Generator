// Konfigurasi server dari environment variable. Hanya dipakai di route handler (server).

export type StorageDriver = "redis" | "memory" | "none";

export interface ServerConfig {
  driver: StorageDriver;
  redisUrl?: string;
  redisToken?: string;
  passcode: string;
  secret: string;
  apiKey: string;
  retentionDays: number;
  /** Mode cloud aktif bila ada penyimpanan DAN passcode instruktur sudah diset. */
  cloudReady: boolean;
  cloudBlockedReason?: string;
}

function intEnv(name: string, def: number, min: number, max: number): number {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}

export function getServerConfig(): ServerConfig {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || undefined;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || undefined;
  const driver: StorageDriver =
    redisUrl && redisToken ? "redis" : process.env.STORAGE_DRIVER === "memory" ? "memory" : "none";
  const passcode = (process.env.INSTRUCTOR_PASSCODE ?? "").trim();
  const secret = (process.env.SESSION_SECRET ?? "").trim() || (passcode ? `derived::${passcode}` : "");
  let cloudBlockedReason: string | undefined;
  if (driver !== "none" && !passcode) cloudBlockedReason = "INSTRUCTOR_PASSCODE belum diset — mode cloud dinonaktifkan agar data peserta tidak terbuka.";
  return {
    driver,
    redisUrl,
    redisToken,
    passcode,
    secret,
    apiKey: (process.env.GENERATOR_API_KEY ?? "").trim(),
    retentionDays: intEnv("RETENTION_DAYS", 180, 1, 3650),
    cloudReady: driver !== "none" && Boolean(passcode),
    cloudBlockedReason,
  };
}
