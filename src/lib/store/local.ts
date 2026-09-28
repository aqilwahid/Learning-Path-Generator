"use client";
// Penyimpanan sesi di browser (mode lokal). Data hanya ada di browser & perangkat ini.
import { SessionSchema, type Session } from "@/lib/model/schemas";

const KEY = "nglp:sessions:v1";

function read(): Session[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.flatMap((x) => {
      const r = SessionSchema.safeParse(x);
      return r.success ? [r.data] : [];
    });
  } catch {
    return [];
  }
}

function write(list: Session[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) {
    throw new Error(
      e instanceof DOMException && e.name === "QuotaExceededError"
        ? "Penyimpanan browser penuh. Ekspor sesi lama lalu hapus dari daftar."
        : "Browser menolak penyimpanan lokal (mode privat?). Data tidak tersimpan.",
    );
  }
}

export function listLocalSessions(): Session[] {
  return read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getLocalSession(id: string): Session | null {
  return read().find((s) => s.id === id) ?? null;
}

export function saveLocalSession(session: Session): Session {
  const list = read();
  const next = { ...session, updatedAt: new Date().toISOString() };
  const i = list.findIndex((s) => s.id === session.id);
  if (i >= 0) list[i] = next;
  else list.push(next);
  write(list);
  return next;
}

export function deleteLocalSession(id: string): void {
  write(read().filter((s) => s.id !== id));
}

/** Impor sesi dari file JSON hasil ekspor (untuk pindah browser/perangkat). */
export function importLocalSession(raw: unknown): Session {
  const parsed = SessionSchema.parse(raw);
  const exists = getLocalSession(parsed.id);
  return saveLocalSession(exists ? { ...parsed, id: `${parsed.id}-${Date.now().toString(36)}` } : parsed);
}
