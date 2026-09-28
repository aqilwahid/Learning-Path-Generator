import type { NextRequest } from "next/server";
import { clientIp, handleError, json, readJson } from "@/lib/server/http";
import { requireStore } from "@/lib/server/guards";
import { SubmitSchema, submitSelf } from "@/lib/server/sessions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

/** Isian mandiri peserta lewat link/QR sesi. */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const store = requireStore();
    const { code } = await params;
    const body = await readJson(req, SubmitSchema);
    const result = await submitSelf(store, code.toUpperCase(), body, clientIp(req));
    return json(result, result.updated ? 200 : 201);
  } catch (e) {
    return handleError(e);
  }
}
