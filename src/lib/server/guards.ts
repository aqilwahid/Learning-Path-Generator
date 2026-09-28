import type { NextRequest } from "next/server";
import { hasValidApiKey, isInstructor } from "./auth";
import { getServerConfig } from "./config";
import { HttpError } from "./http";
import { getStore, type SessionStore } from "./store";

export function requireStore(): SessionStore {
  const store = getStore();
  if (!store) {
    const reason = getServerConfig().cloudBlockedReason;
    throw new HttpError(503, reason ?? "Mode cloud belum aktif. Atur UPSTASH_REDIS_REST_URL/TOKEN dan INSTRUCTOR_PASSCODE.");
  }
  return store;
}

export async function requireInstructor(req: NextRequest): Promise<SessionStore> {
  const store = requireStore();
  if (!(await isInstructor(req))) throw new HttpError(401, "Silakan masuk sebagai instruktur.");
  return store;
}

export async function requireApiKey(req: NextRequest): Promise<void> {
  if (!getServerConfig().apiKey) throw new HttpError(404, "API integrasi tidak aktif (GENERATOR_API_KEY belum diset).");
  if (!(await hasValidApiKey(req))) throw new HttpError(401, "API key tidak valid.");
}
