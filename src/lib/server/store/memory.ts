// Penyimpanan di memori proses — untuk pengembangan/tes (STORAGE_DRIVER=memory). Data hilang saat server restart.
import type { ParticipantRecord, SessionMeta, SessionStore, SessionSummary } from "./types";

interface MemoryState {
  sessions: Map<string, SessionMeta>;
  codes: Map<string, string>;
  participants: Map<string, Map<string, ParticipantRecord>>;
  hits: Map<string, { count: number; resetAt: number }>;
}

const g = globalThis as unknown as { __nglpMemoryStore?: MemoryState };

function state(): MemoryState {
  if (!g.__nglpMemoryStore) {
    g.__nglpMemoryStore = { sessions: new Map(), codes: new Map(), participants: new Map(), hits: new Map() };
  }
  return g.__nglpMemoryStore;
}

function isExpired(meta: SessionMeta): boolean {
  return Boolean(meta.expiresAt && Date.parse(meta.expiresAt) < Date.now());
}

const clone = <T,>(v: T): T => structuredClone(v);

export function createMemoryStore(): SessionStore {
  const s = state();
  const purge = (id: string) => {
    const meta = s.sessions.get(id);
    if (meta) s.codes.delete(meta.code);
    s.sessions.delete(id);
    s.participants.delete(id);
  };
  return {
    async listSessions() {
      const out: SessionSummary[] = [];
      for (const meta of s.sessions.values()) {
        if (isExpired(meta)) {
          purge(meta.id);
          continue;
        }
        out.push({ ...clone(meta), participantCount: s.participants.get(meta.id)?.size ?? 0 });
      }
      return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async getSessionMeta(id) {
      const meta = s.sessions.get(id);
      if (!meta) return null;
      if (isExpired(meta)) {
        purge(id);
        return null;
      }
      return clone(meta);
    },
    async getSessionIdByCode(code) {
      return s.codes.get(code.toUpperCase()) ?? null;
    },
    async createSession(meta) {
      s.sessions.set(meta.id, clone(meta));
      s.codes.set(meta.code, meta.id);
      s.participants.set(meta.id, new Map());
    },
    async updateSessionMeta(meta) {
      if (!s.sessions.has(meta.id)) throw new Error("Sesi tidak ditemukan");
      s.sessions.set(meta.id, clone(meta));
    },
    async deleteSession(id) {
      purge(id);
    },
    async listParticipants(id) {
      return [...(s.participants.get(id)?.values() ?? [])].map(clone);
    },
    async getParticipant(id, pid) {
      const r = s.participants.get(id)?.get(pid);
      return r ? clone(r) : null;
    },
    async putParticipants(id, records) {
      const map = s.participants.get(id) ?? new Map();
      for (const r of records) map.set(r.p.id, clone(r));
      s.participants.set(id, map);
    },
    async replaceParticipants(id, records) {
      s.participants.set(id, new Map(records.map((r) => [r.p.id, clone(r)])));
    },
    async deleteParticipant(id, pid) {
      s.participants.get(id)?.delete(pid);
    },
    async countParticipants(id) {
      return s.participants.get(id)?.size ?? 0;
    },
    async hit(key, windowSec) {
      const now = Date.now();
      const cur = s.hits.get(key);
      if (!cur || cur.resetAt < now) {
        s.hits.set(key, { count: 1, resetAt: now + windowSec * 1000 });
        return 1;
      }
      cur.count++;
      return cur.count;
    },
  };
}
