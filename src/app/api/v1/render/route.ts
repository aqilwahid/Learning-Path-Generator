import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { buildInstitutionPlan, buildParticipantPlan, defaultSettings, emptyParticipant, newId } from "@/lib/engine";
import { ParticipantSchema, PlanSettingsSchema } from "@/lib/model/schemas";
import { handleError, readJson } from "@/lib/server/http";
import { requireApiKey } from "@/lib/server/guards";
import { svgToPngNode } from "@/lib/render/png-node";
import { INDIVIDUAL_SIZE, INSTITUTION_SIZE, renderIndividualSvg, renderInstitutionSvg } from "@/lib/render/svg";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const InputParticipant = ParticipantSchema.partial().extend({ name: z.string().trim().min(1).max(120) });

const Body = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("individual"),
    participant: InputParticipant,
    settings: PlanSettingsSchema.partial().optional(),
    format: z.enum(["png", "svg"]).default("png"),
    sessionTitle: z.string().max(160).optional(),
  }),
  z.object({
    kind: z.literal("institution"),
    participants: z.array(InputParticipant).min(1).max(500),
    settings: PlanSettingsSchema.partial().optional(),
    format: z.enum(["png", "svg"]).default("png"),
    meta: z.object({
      title: z.string().trim().min(1).max(160),
      instansi: z.string().max(160).optional(),
      departemen: z.string().max(160).optional(),
    }),
  }),
]);

/**
 * API integrasi: hasilkan gambar learning path (PNG/SVG) di server.
 * Contoh n8n: HTTP Request (POST, JSON) → Telegram "Send Photo" dari binary respons.
 */
export async function POST(req: NextRequest) {
  try {
    await requireApiKey(req);
    const body = await readJson(req, Body);
    const settings = PlanSettingsSchema.parse({ ...defaultSettings(), ...(body.settings ?? {}) });
    const toParticipant = (p: z.infer<typeof InputParticipant>) =>
      ParticipantSchema.parse({ ...emptyParticipant(), ...p, id: p.id ?? newId() });

    let svg: string;
    let width: number;
    let scale: number;
    if (body.kind === "individual") {
      svg = await renderIndividualSvg(buildParticipantPlan(toParticipant(body.participant), settings), { sessionTitle: body.sessionTitle });
      width = INDIVIDUAL_SIZE.width;
      scale = 2;
    } else {
      svg = await renderInstitutionSvg(buildInstitutionPlan(body.participants.map(toParticipant), settings), body.meta);
      width = INSTITUTION_SIZE.width;
      scale = 1.5;
    }
    if (body.format === "svg") {
      return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "no-store" } });
    }
    const png = svgToPngNode(svg, width, scale);
    return new NextResponse(png as unknown as BodyInit, {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store", "Content-Disposition": 'inline; filename="learning-path.png"' },
    });
  } catch (e) {
    return handleError(e);
  }
}
