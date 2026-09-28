import { getServerConfig } from "../config";
import { createMemoryStore } from "./memory";
import { createRedisStore } from "./redis";
import type { SessionStore } from "./types";

export type { ParticipantRecord, SessionMeta, SessionStore, SessionSummary } from "./types";

let cached: { key: string; store: SessionStore } | null = null;

/** Penyimpanan aktif, atau null bila mode lokal (tanpa database). */
export function getStore(): SessionStore | null {
  const cfg = getServerConfig();
  if (!cfg.cloudReady) return null;
  const key = `${cfg.driver}:${cfg.redisUrl ?? ""}`;
  if (cached?.key === key) return cached.store;
  const store = cfg.driver === "redis" ? createRedisStore(cfg.redisUrl!, cfg.redisToken!) : createMemoryStore();
  cached = { key, store };
  return store;
}
