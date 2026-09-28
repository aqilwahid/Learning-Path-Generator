// Render contoh gambar (PNG + SVG) dari data fiktif ke samples/out/ — untuk cek visual & demo.
// Jalankan: npm run render:samples
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildInstitutionPlan, buildParticipantPlan } from "@/lib/engine";
import { INDIVIDUAL_SIZE, INSTITUTION_SIZE, renderIndividualSvg, renderInstitutionSvg } from "@/lib/render/svg";
import { svgToPngNode } from "@/lib/render/png-node";
import {
  denseParticipant,
  largeSample,
  SAMPLE_INSTANSI,
  SAMPLE_SESSION_TITLE,
  sampleParticipants,
  sampleSettings,
} from "../samples/fixtures";

const out = join(process.cwd(), "samples", "out");
mkdirSync(out, { recursive: true });
const generatedAt = new Date("2026-09-26T09:00:00+07:00");

async function main() {
  const picks = [sampleParticipants[0], sampleParticipants[1], sampleParticipants[5], denseParticipant];
  for (const p of picks) {
    const plan = buildParticipantPlan(p, sampleSettings);
    const t0 = Date.now();
    const svg = await renderIndividualSvg(plan, { generatedAt, sessionTitle: SAMPLE_SESSION_TITLE });
    const png = svgToPngNode(svg, INDIVIDUAL_SIZE.width, 1);
    writeFileSync(join(out, `individu-${p.id}.svg`), svg);
    writeFileSync(join(out, `individu-${p.id}.png`), png);
    console.log(`individu-${p.id}: ${Date.now() - t0} ms, svg ${(svg.length / 1024).toFixed(0)} KB`);
  }
  const cases = [
    { file: "instansi", people: sampleParticipants, title: SAMPLE_SESSION_TITLE },
    { file: "instansi-besar", people: largeSample(), title: "Program Pengembangan Kompetensi TIK Pemerintah Kabupaten Contoh 2027" },
  ];
  for (const c of cases) {
    const inst = buildInstitutionPlan(c.people, sampleSettings);
    const t0 = Date.now();
    const svg = await renderInstitutionSvg(inst, { title: c.title, instansi: SAMPLE_INSTANSI, departemen: "Bidang TIK" }, { generatedAt });
    const png = svgToPngNode(svg, INSTITUTION_SIZE.width, 1);
    writeFileSync(join(out, `${c.file}.svg`), svg);
    writeFileSync(join(out, `${c.file}.png`), png);
    console.log(`${c.file}: ${Date.now() - t0} ms`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
