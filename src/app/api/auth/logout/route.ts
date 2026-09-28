import { clearAuthCookie } from "@/lib/server/auth";
import { json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = json({ ok: true });
  clearAuthCookie(res);
  return res;
}
