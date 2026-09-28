import { PlanSettingsSchema, type Participant, type PlanSettings } from "@/lib/model/schemas";
import { defaultStartMonth } from "./periods";

export function defaultSettings(now: Date = new Date()): PlanSettings {
  return PlanSettingsSchema.parse({ startMonth: defaultStartMonth(now) });
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyParticipant(partial: Partial<Participant> = {}): Participant {
  const now = new Date().toISOString();
  return {
    id: newId(),
    name: "",
    jabatan: "",
    departemen: "",
    instansi: "",
    roleId: null,
    currentLevel: 0,
    targetLevel: null,
    completedCodes: [],
    completedTopicIds: [],
    trackPrefs: [],
    includeBaseline: false,
    certifications: "",
    notes: "",
    source: "instruktur",
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

const JOIN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa O/0/I/1 agar mudah dibaca

export function newJoinCode(length = 6): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => JOIN_ALPHABET[b % JOIN_ALPHABET.length]).join("");
}
