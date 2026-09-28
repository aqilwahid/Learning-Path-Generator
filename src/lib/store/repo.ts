"use client";
// Satu antarmuka untuk dua mode penyimpanan: lokal (browser) dan cloud (API + Upstash).
import { defaultSettings, newId, newJoinCode } from "@/lib/engine";
import { PlanSettingsSchema, type Participant, type PlanSettings, type Session } from "@/lib/model/schemas";
import { deleteLocalSession, getLocalSession, listLocalSessions, saveLocalSession } from "./local";

export type StorageMode = "local" | "cloud";

export interface SessionListItem {
  id: string;
  code: string;
  title: string;
  instansi: string;
  departemen: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  open: boolean;
  participantCount: number;
}

export interface CreateSessionInput {
  title: string;
  instansi: string;
  departemen: string;
  settings?: Partial<PlanSettings>;
}

export interface SessionPatch {
  title?: string;
  instansi?: string;
  departemen?: string;
  open?: boolean;
  settings?: Partial<PlanSettings>;
}

export interface SessionRepo {
  mode: StorageMode;
  list(): Promise<SessionListItem[]>;
  create(input: CreateSessionInput): Promise<Session>;
  get(id: string): Promise<Session>;
  update(id: string, patch: SessionPatch): Promise<Session>;
  remove(id: string): Promise<void>;
  putParticipants(id: string, participants: Participant[], mode?: "upsert" | "replace"): Promise<Session>;
  deleteParticipant(id: string, pid: string): Promise<Session>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    credentials: "same-origin",
    cache: "no-store",
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* bukan JSON */
  }
  if (!res.ok) {
    const msg = (data as { error?: string } | null)?.error ?? `Permintaan gagal (${res.status}).`;
    throw new ApiError(res.status, msg, (data as { details?: unknown } | null)?.details);
  }
  return data as T;
}

const toItem = (s: Session): SessionListItem => ({
  id: s.id,
  code: s.code,
  title: s.title,
  instansi: s.instansi,
  departemen: s.departemen,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
  expiresAt: s.expiresAt,
  open: s.open,
  participantCount: s.participants.length,
});

export function localRepo(): SessionRepo {
  const must = (id: string) => {
    const s = getLocalSession(id);
    if (!s) throw new ApiError(404, "Sesi tidak ditemukan di browser ini.");
    return s;
  };
  return {
    mode: "local",
    async list() {
      return listLocalSessions().map(toItem);
    },
    async create(input) {
      const now = new Date().toISOString();
      return saveLocalSession({
        id: newId(),
        code: newJoinCode(),
        title: input.title,
        instansi: input.instansi,
        departemen: input.departemen,
        createdAt: now,
        updatedAt: now,
        open: true,
        settings: PlanSettingsSchema.parse({ ...defaultSettings(), ...(input.settings ?? {}) }),
        participants: [],
      });
    },
    async get(id) {
      return must(id);
    },
    async update(id, patch) {
      const s = must(id);
      return saveLocalSession({
        ...s,
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.instansi !== undefined ? { instansi: patch.instansi } : {}),
        ...(patch.departemen !== undefined ? { departemen: patch.departemen } : {}),
        ...(patch.open !== undefined ? { open: patch.open } : {}),
        settings: patch.settings ? PlanSettingsSchema.parse({ ...s.settings, ...patch.settings }) : s.settings,
      });
    },
    async remove(id) {
      deleteLocalSession(id);
    },
    async putParticipants(id, participants, mode = "upsert") {
      const s = must(id);
      const now = new Date().toISOString();
      const stamped = participants.map((p) => ({ ...p, id: p.id || newId(), updatedAt: now, createdAt: p.createdAt ?? now }));
      let list: Participant[];
      if (mode === "replace") list = stamped;
      else {
        const map = new Map(s.participants.map((p) => [p.id, p]));
        for (const p of stamped) map.set(p.id, { ...p, createdAt: map.get(p.id)?.createdAt ?? p.createdAt });
        list = [...map.values()];
      }
      return saveLocalSession({ ...s, participants: list });
    },
    async deleteParticipant(id, pid) {
      const s = must(id);
      return saveLocalSession({ ...s, participants: s.participants.filter((p) => p.id !== pid) });
    },
  };
}

export function cloudRepo(): SessionRepo {
  return {
    mode: "cloud",
    async list() {
      return (await apiFetch<{ sessions: SessionListItem[] }>("/api/sessions")).sessions;
    },
    async create(input) {
      return (await apiFetch<{ session: Session }>("/api/sessions", { method: "POST", body: JSON.stringify(input) })).session;
    },
    async get(id) {
      return (await apiFetch<{ session: Session }>(`/api/sessions/${encodeURIComponent(id)}`)).session;
    },
    async update(id, patch) {
      return (await apiFetch<{ session: Session }>(`/api/sessions/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) })).session;
    },
    async remove(id) {
      await apiFetch(`/api/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
    async putParticipants(id, participants, mode = "upsert") {
      return (
        await apiFetch<{ session: Session }>(`/api/sessions/${encodeURIComponent(id)}/participants`, {
          method: "PUT",
          body: JSON.stringify({ mode, participants }),
        })
      ).session;
    },
    async deleteParticipant(id, pid) {
      return (
        await apiFetch<{ session: Session }>(`/api/sessions/${encodeURIComponent(id)}/participants/${encodeURIComponent(pid)}`, {
          method: "DELETE",
        })
      ).session;
    },
  };
}

export function repoFor(mode: StorageMode): SessionRepo {
  return mode === "cloud" ? cloudRepo() : localRepo();
}
