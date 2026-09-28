import type { NextRequest } from "next/server";
import { z } from "zod";
import { buildInstitutionPlan, defaultSettings, emptyParticipant, newId } from "@/lib/engine";
import { ParticipantSchema, PlanSettingsSchema } from "@/lib/model/schemas";
import { handleError, json, readJson } from "@/lib/server/http";
import { requireApiKey } from "@/lib/server/guards";
import { serializeInstitutionPlan } from "@/lib/server/serialize";

export const dynamic = "force-dynamic";

const InputParticipant = ParticipantSchema.partial().extend({ name: z.string().trim().min(1).max(120) });

const Body = z.object({
  participants: z.array(InputParticipant).min(1).max(500),
  settings: PlanSettingsSchema.partial().optional(),
});

/**
 * API integrasi (mis. n8n): kirim daftar peserta → terima rencana instansi + per peserta (JSON).
 * Header: x-api-key: <GENERATOR_API_KEY>
 */
export async function POST(req: NextRequest) {
  try {
    await requireApiKey(req);
    const body = await readJson(req, Body);
    const settings = PlanSettingsSchema.parse({ ...defaultSettings(), ...(body.settings ?? {}) });
    const participants = body.participants.map((p) => ParticipantSchema.parse({ ...emptyParticipant(), ...p, id: p.id ?? newId() }));
    return json(serializeInstitutionPlan(buildInstitutionPlan(participants, settings)));
  } catch (e) {
    return handleError(e);
  }
}
