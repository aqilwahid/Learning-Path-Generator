import satori from "satori";
import { createElement } from "react";
import { BRAND } from "@/config/brand";
import { getCatalog } from "@/lib/catalog";
import type { InstitutionPlan, ParticipantPlan } from "@/lib/engine";
import { getSatoriFonts } from "./fonts";
import { INDIVIDUAL_SIZE, IndividualTemplate } from "./individual";
import { INSTITUTION_SIZE, InstitutionTemplate, type InstitutionMeta } from "./institution";

export { INDIVIDUAL_SIZE, INSTITUTION_SIZE };
export type { InstitutionMeta };

export interface RenderOptions {
  generatedAt?: Date;
  orgName?: string;
  sessionTitle?: string;
}

export async function renderIndividualSvg(plan: ParticipantPlan, opts: RenderOptions = {}): Promise<string> {
  const catalog = getCatalog();
  const element = createElement(IndividualTemplate, {
    plan,
    generatedAt: opts.generatedAt ?? new Date(),
    orgName: opts.orgName ?? BRAND.orgName,
    programName: catalog.program,
    catalogVersion: catalog.version,
    sessionTitle: opts.sessionTitle,
  });
  return satori(element, { ...INDIVIDUAL_SIZE, fonts: getSatoriFonts() });
}

export async function renderInstitutionSvg(
  plan: InstitutionPlan,
  meta: InstitutionMeta,
  opts: RenderOptions = {},
): Promise<string> {
  const catalog = getCatalog();
  const element = createElement(InstitutionTemplate, {
    plan,
    meta,
    generatedAt: opts.generatedAt ?? new Date(),
    orgName: opts.orgName ?? BRAND.orgName,
    programName: catalog.program,
    catalogVersion: catalog.version,
  });
  return satori(element, { ...INSTITUTION_SIZE, fonts: getSatoriFonts() });
}
