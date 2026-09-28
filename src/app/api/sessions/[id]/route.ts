import type { NextRequest } from "next/server";
import { handleError, json, readJson } from "@/lib/server/http";
import { requireInstructor } from "@/lib/server/guards";
import { getFullSession, UpdateSessionSchema, updateSession } from "@/lib/server/sessions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const store = await requireInstructor(req);
    const { id } = await params;
    return json({ session: await getFullSession(store, id) });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const store = await requireInstructor(req);
    const { id } = await params;
    const patch = await readJson(req, UpdateSessionSchema);
    await updateSession(store, id, patch);
    return json({ session: await getFullSession(store, id) });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const store = await requireInstructor(req);
    const { id } = await params;
    await store.deleteSession(id);
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
