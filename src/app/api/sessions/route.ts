import type { NextRequest } from "next/server";
import { handleError, json, readJson } from "@/lib/server/http";
import { requireInstructor } from "@/lib/server/guards";
import { CreateSessionSchema, createSession } from "@/lib/server/sessions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const store = await requireInstructor(req);
    return json({ sessions: await store.listSessions() });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const store = await requireInstructor(req);
    const body = await readJson(req, CreateSessionSchema);
    const meta = await createSession(store, body);
    return json({ session: { ...meta, participants: [] } }, 201);
  } catch (e) {
    return handleError(e);
  }
}
