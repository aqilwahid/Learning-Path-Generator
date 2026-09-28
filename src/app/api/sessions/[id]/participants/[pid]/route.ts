import type { NextRequest } from "next/server";
import { handleError, json } from "@/lib/server/http";
import { requireInstructor } from "@/lib/server/guards";
import { getFullSession } from "@/lib/server/sessions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; pid: string }> };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const store = await requireInstructor(req);
    const { id, pid } = await params;
    await store.deleteParticipant(id, pid);
    return json({ session: await getFullSession(store, id) });
  } catch (e) {
    return handleError(e);
  }
}
