import type { NextRequest } from "next/server";
import { isInstructor } from "@/lib/server/auth";
import { getServerConfig } from "@/lib/server/config";
import { json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Status mode aplikasi untuk UI: lokal (tanpa database) atau cloud (link/QR peserta aktif). */
export async function GET(req: NextRequest) {
  const cfg = getServerConfig();
  return json({
    mode: cfg.cloudReady ? "cloud" : "local",
    driver: cfg.driver,
    authenticated: cfg.cloudReady ? await isInstructor(req) : false,
    apiEnabled: Boolean(cfg.apiKey),
    retentionDays: cfg.retentionDays,
    notice: cfg.cloudBlockedReason ?? null,
  });
}
