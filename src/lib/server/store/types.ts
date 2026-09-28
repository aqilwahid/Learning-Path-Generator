import type { Participant, Session } from "@/lib/model/schemas";

export type SessionMeta = Omit<Session, "participants">;

export interface SessionSummary extends SessionMeta {
  participantCount: number;
}

/** Catatan peserta di penyimpanan. `editToken` hanya dimiliki browser peserta yang mengisi mandiri. */
export interface ParticipantRecord {
  p: Participant;
  editToken?: string;
}

export interface SessionStore {
  listSessions(): Promise<SessionSummary[]>;
  getSessionMeta(id: string): Promise<SessionMeta | null>;
  getSessionIdByCode(code: string): Promise<string | null>;
  createSession(meta: SessionMeta): Promise<void>;
  updateSessionMeta(meta: SessionMeta): Promise<void>;
  deleteSession(id: string): Promise<void>;
  listParticipants(id: string): Promise<ParticipantRecord[]>;
  getParticipant(id: string, pid: string): Promise<ParticipantRecord | null>;
  putParticipants(id: string, records: ParticipantRecord[]): Promise<void>;
  replaceParticipants(id: string, records: ParticipantRecord[]): Promise<void>;
  deleteParticipant(id: string, pid: string): Promise<void>;
  countParticipants(id: string): Promise<number>;
  /** Penghitung sederhana untuk pembatasan laju (rate limit). */
  hit(key: string, windowSec: number): Promise<number>;
}
