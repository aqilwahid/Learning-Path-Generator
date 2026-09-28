import type { NextRequest } from "next/server";
import { handleError, json } from "@/lib/server/http";
import { requireStore } from "@/lib/server/guards";
import { publicSessionInfo } from "@/lib/server/sessions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

/** Info sesi untuk form peserta — tidak memuat data peserta lain. */
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const store = requireStore();
    const { code } = await params;
    return json({ session: await publicSessionInfo(store, code.toUpperCase()) });
  } catch (e) {
    return handleError(e);
  }
}
