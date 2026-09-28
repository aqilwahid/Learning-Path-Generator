// Penyimpanan Upstash Redis (REST) — cocok untuk Vercel. Semua kunci diberi awalan `nglp:` dan kedaluwarsa otomatis.
import { Redis } from "@upstash/redis";
import type { ParticipantRecord, SessionMeta, SessionStore, SessionSummary } from "./types";

const P = "nglp";
const kSession = (id: string) => `${P}:session:${id}`;
const kParticipants = (id: string) => `${P}:session:${id}:participants`;
const kCode = (code: string) => `${P}:code:${code.toUpperCase()}`;
const kIndex = `${P}:sessions`;
const kHit = (key: string) => `${P}:hit:${key}`;

function parse<T>(v: unknown): T | null {
  if (v == null) return null;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return null;
    }
  }
  return v as T;
}

export function createRedisStore(url: string, token: string): SessionStore {
  const redis = new Redis({ url, token, automaticDeserialization: false });

  /** Samakan waktu kedaluwarsa semua kunci sesi dengan `expiresAt`. */
  async function applyExpiry(meta: SessionMeta): Promise<void> {
    if (!meta.expiresAt) return;
    const at = Math.floor(Date.parse(meta.expiresAt) / 1000);
    const p = redis.pipeline();
    p.expireat(kSession(meta.id), at);
    p.expireat(kParticipants(meta.id), at);
    p.expireat(kCode(meta.code), at);
    await p.exec();
  }

  async function putParticipants(id: string, records: ParticipantRecord[]): Promise<void> {
    if (!records.length) return;
    const map: Record<string, string> = {};
    for (const r of records) map[r.p.id] = JSON.stringify(r);
    await redis.hset(kParticipants(id), map);
    const meta = parse<SessionMeta>(await redis.get(kSession(id)));
    if (meta) await applyExpiry(meta);
  }

  return {
    async listSessions() {
      const ids = (await redis.zrange(kIndex, 0, -1, { rev: true })) as string[];
      if (!ids.length) return [];
      const metas = (await redis.mget(...ids.map(kSession))) as unknown[];
      const out: SessionSummary[] = [];
      const stale: string[] = [];
      const alive: SessionMeta[] = [];
      metas.forEach((raw, i) => {
        const meta = parse<SessionMeta>(raw);
        if (meta) alive.push(meta);
        else stale.push(ids[i]);
      });
      if (stale.length) await redis.zrem(kIndex, ...stale);
      if (alive.length) {
        const p = redis.pipeline();
        for (const m of alive) p.hlen(kParticipants(m.id));
        const counts = (await p.exec()) as number[];
        alive.forEach((m, i) => out.push({ ...m, participantCount: Number(counts[i] ?? 0) }));
      }
      return out;
    },
    async getSessionMeta(id) {
      return parse<SessionMeta>(await redis.get(kSession(id)));
    },
    async getSessionIdByCode(code) {
      const v = await redis.get(kCode(code));
      return typeof v === "string" ? v : null;
    },
    async createSession(meta) {
      const p = redis.pipeline();
      p.set(kSession(meta.id), JSON.stringify(meta));
      p.set(kCode(meta.code), meta.id);
      p.zadd(kIndex, { score: Date.parse(meta.createdAt), member: meta.id });
      await p.exec();
      await applyExpiry(meta);
    },
    async updateSessionMeta(meta) {
      await redis.set(kSession(meta.id), JSON.stringify(meta), { keepTtl: true });
    },
    async deleteSession(id) {
      const meta = parse<SessionMeta>(await redis.get(kSession(id)));
      const p = redis.pipeline();
      p.del(kSession(id));
      p.del(kParticipants(id));
      if (meta) p.del(kCode(meta.code));
      p.zrem(kIndex, id);
      await p.exec();
    },
    async listParticipants(id) {
      const all = (await redis.hgetall(kParticipants(id))) as Record<string, unknown> | null;
      if (!all) return [];
      return Object.values(all)
        .map((v) => parse<ParticipantRecord>(v))
        .filter((r): r is ParticipantRecord => Boolean(r));
    },
    async getParticipant(id, pid) {
      return parse<ParticipantRecord>(await redis.hget(kParticipants(id), pid));
    },
    putParticipants,
    async replaceParticipants(id, records) {
      await redis.del(kParticipants(id));
      await putParticipants(id, records);
    },
    async deleteParticipant(id, pid) {
      await redis.hdel(kParticipants(id), pid);
    },
    async countParticipants(id) {
      return Number(await redis.hlen(kParticipants(id)));
    },
    async hit(key, windowSec) {
      const k = kHit(key);
      const n = Number(await redis.incr(k));
      if (n === 1) await redis.expire(k, windowSec);
      return n;
    },
  };
}
