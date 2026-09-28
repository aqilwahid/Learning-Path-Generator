import type { NextRequest } from "next/server";
import { handleError, json, readJson } from "@/lib/server/http";
import { requireInstructor } from "@/lib/server/guards";
import { getFullSession, PutParticipantsSchema, putParticipants } from "@/lib/server/sessions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Tambah/perbarui (upsert) atau ganti seluruh (replace) daftar peserta. */
export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const store = await requireInstructor(req);
    const { id } = await params;
    const body = await readJson(req, PutParticipantsSchema);
    await putParticipants(store, id, body);
    return json({ session: await getFullSession(store, id) });
  } catch (e) {
    return handleError(e);
  }
}
