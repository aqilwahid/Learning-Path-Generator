// Logika bisnis sesi (dipakai route handler). Tidak bergantung pada jenis penyimpanan.
import { z } from "zod";
import { defaultSettings, newId, newJoinCode } from "@/lib/engine";
import {
  ParticipantSchema,
  PlanSettingsSchema,
  SelfSubmissionSchema,
  type Participant,
  type Session,
} from "@/lib/model/schemas";
import { getServerConfig } from "./config";
import { HttpError } from "./http";
import type { ParticipantRecord, SessionMeta, SessionStore } from "./store";

export const MAX_PARTICIPANTS_PER_SESSION = 500;

export const CreateSessionSchema = z.object({
  title: z.string().trim().min(1, "Judul sesi wajib diisi").max(160),
  instansi: z.string().trim().max(160).default(""),
  departemen: z.string().trim().max(160).default(""),
  settings: PlanSettingsSchema.partial().optional(),
});

export const UpdateSessionSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  instansi: z.string().trim().max(160).optional(),
  departemen: z.string().trim().max(160).optional(),
  open: z.boolean().optional(),
  settings: PlanSettingsSchema.partial().optional(),
});

export const PutParticipantsSchema = z.object({
  mode: z.enum(["upsert", "replace"]).default("upsert"),
  participants: z.array(ParticipantSchema).max(MAX_PARTICIPANTS_PER_SESSION),
});

export const SubmitSchema = z.object({
  participant: SelfSubmissionSchema,
  participantId: z.string().max(64).optional(),
  editToken: z.string().max(80).optional(),
});

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSession(store: SessionStore, input: z.infer<typeof CreateSessionSchema>): Promise<SessionMeta> {
  const cfg = getServerConfig();
  let code = newJoinCode();
  for (let i = 0; i < 5 && (await store.getSessionIdByCode(code)); i++) code = newJoinCode();
  const now = new Date();
  const meta: SessionMeta = {
    id: newId(),
    code,
    title: input.title,
    instansi: input.instansi,
    departemen: input.departemen,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + cfg.retentionDays * 86400_000).toISOString(),
    open: true,
    settings: PlanSettingsSchema.parse({ ...defaultSettings(now), ...(input.settings ?? {}) }),
  };
  await store.createSession(meta);
  return meta;
}

export async function getFullSession(store: SessionStore, id: string): Promise<Session> {
  const meta = await store.getSessionMeta(id);
  if (!meta) throw new HttpError(404, "Sesi tidak ditemukan atau sudah kedaluwarsa.");
  const records = await store.listParticipants(id);
  const participants = records
    .map((r) => r.p)
    .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? "") || a.name.localeCompare(b.name));
  return { ...meta, participants };
}

export async function updateSession(store: SessionStore, id: string, patch: z.infer<typeof UpdateSessionSchema>): Promise<SessionMeta> {
  const meta = await store.getSessionMeta(id);
  if (!meta) throw new HttpError(404, "Sesi tidak ditemukan.");
  const next: SessionMeta = {
    ...meta,
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.instansi !== undefined ? { instansi: patch.instansi } : {}),
    ...(patch.departemen !== undefined ? { departemen: patch.departemen } : {}),
    ...(patch.open !== undefined ? { open: patch.open } : {}),
    settings: patch.settings ? PlanSettingsSchema.parse({ ...meta.settings, ...patch.settings }) : meta.settings,
    updatedAt: new Date().toISOString(),
  };
  await store.updateSessionMeta(next);
  return next;
}

export async function putParticipants(store: SessionStore, id: string, input: z.infer<typeof PutParticipantsSchema>): Promise<number> {
  const meta = await store.getSessionMeta(id);
  if (!meta) throw new HttpError(404, "Sesi tidak ditemukan.");
  const existing = new Map((await store.listParticipants(id)).map((r) => [r.p.id, r]));
  const now = new Date().toISOString();
  const records: ParticipantRecord[] = input.participants.map((p) => ({
    p: { ...p, updatedAt: now, createdAt: p.createdAt ?? existing.get(p.id)?.p.createdAt ?? now },
    editToken: existing.get(p.id)?.editToken,
  }));
  if (input.mode === "replace") {
    await store.replaceParticipants(id, records);
  } else {
    const ids = new Set([...existing.keys(), ...records.map((r) => r.p.id)]);
    if (ids.size > MAX_PARTICIPANTS_PER_SESSION) throw new HttpError(409, `Maksimal ${MAX_PARTICIPANTS_PER_SESSION} peserta per sesi.`);
    await store.putParticipants(id, records);
  }
  await store.updateSessionMeta({ ...meta, updatedAt: now });
  return store.countParticipants(id);
}

/** Info publik sesi untuk halaman isian peserta (tanpa data peserta lain). */
export async function publicSessionInfo(store: SessionStore, code: string) {
  const id = await store.getSessionIdByCode(code);
  const meta = id ? await store.getSessionMeta(id) : null;
  if (!meta) throw new HttpError(404, "Kode sesi tidak ditemukan atau sudah kedaluwarsa.");
  return {
    code: meta.code,
    title: meta.title,
    instansi: meta.instansi,
    departemen: meta.departemen,
    open: meta.open,
    settings: meta.settings,
  };
}

export async function submitSelf(
  store: SessionStore,
  code: string,
  input: z.infer<typeof SubmitSchema>,
  ip: string,
): Promise<{ participant: Participant; participantId: string; editToken: string; updated: boolean }> {
  const id = await store.getSessionIdByCode(code);
  const meta = id ? await store.getSessionMeta(id) : null;
  if (!meta) throw new HttpError(404, "Kode sesi tidak ditemukan atau sudah kedaluwarsa.");
  if (!meta.open) throw new HttpError(403, "Sesi ini sudah ditutup oleh instruktur.");
  if ((await store.hit(`submit:${meta.id}:${ip}`, 600)) > 30) throw new HttpError(429, "Terlalu banyak kiriman. Coba lagi beberapa menit lagi.");

  const { website: _honeypot, ...fields } = input.participant;
  const now = new Date().toISOString();

  // perbarui isian lama bila browser peserta memegang token yang cocok
  if (input.participantId && input.editToken) {
    const prev = await store.getParticipant(meta.id, input.participantId);
    if (prev?.editToken && prev.editToken === input.editToken) {
      const participant = ParticipantSchema.parse({
        ...fields,
        instansi: fields.instansi || meta.instansi,
        id: prev.p.id,
        source: "peserta",
        createdAt: prev.p.createdAt,
        updatedAt: now,
      });
      await store.putParticipants(meta.id, [{ p: participant, editToken: prev.editToken }]);
      return { participant, participantId: participant.id, editToken: prev.editToken, updated: true };
    }
  }

  if ((await store.countParticipants(meta.id)) >= MAX_PARTICIPANTS_PER_SESSION) {
    throw new HttpError(409, "Kuota peserta sesi ini sudah penuh.");
  }
  const editToken = randomToken();
  const participant = ParticipantSchema.parse({
    ...fields,
    instansi: fields.instansi || meta.instansi,
    id: newId(),
    source: "peserta",
    createdAt: now,
    updatedAt: now,
  });
  await store.putParticipants(meta.id, [{ p: participant, editToken }]);
  return { participant, participantId: participant.id, editToken, updated: false };
}
