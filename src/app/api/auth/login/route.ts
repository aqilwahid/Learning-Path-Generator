import type { NextRequest } from "next/server";
import { z } from "zod";
import { createAuthToken, passcodeMatches, setAuthCookie } from "@/lib/server/auth";
import { getServerConfig } from "@/lib/server/config";
import { clientIp, fail, handleError, json, readJson } from "@/lib/server/http";
import { requireStore } from "@/lib/server/guards";

export const dynamic = "force-dynamic";

const Body = z.object({ passcode: z.string().min(1).max(200) });

export async function POST(req: NextRequest) {
  try {
    const store = requireStore();
    const cfg = getServerConfig();
    if ((await store.hit(`login:${clientIp(req)}`, 900)) > 10) {
      return fail(429, "Terlalu banyak percobaan. Coba lagi 15 menit lagi.");
    }
    const { passcode } = await readJson(req, Body);
    if (!(await passcodeMatches(passcode, cfg.passcode, cfg.secret))) return fail(401, "Passcode salah.");
    const token = await createAuthToken(cfg.secret);
    const res = json({ ok: true });
    setAuthCookie(res, token.value, token.maxAge);
    return res;
  } catch (e) {
    return handleError(e);
  }
}
