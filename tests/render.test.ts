import { describe, expect, it } from "vitest";
import { buildInstitutionPlan, buildParticipantPlan } from "@/lib/engine";
import { INDIVIDUAL_SIZE, INSTITUTION_SIZE, renderIndividualSvg, renderInstitutionSvg } from "@/lib/render/svg";
import { svgToPngNode } from "@/lib/render/png-node";
import { denseParticipant, largeSample, sampleParticipants, sampleSettings } from "../samples/fixtures";

function pngSize(png: Uint8Array): { width: number; height: number } {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  expect(Array.from(png.slice(1, 4))).toEqual([0x50, 0x4e, 0x47]); // "PNG"
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

describe("render gambar", () => {
  const at = new Date("2026-09-26T09:00:00+07:00");

  it("gambar perorangan: SVG A4 dan PNG 2x (≈300 dpi)", async () => {
    const plan = buildParticipantPlan(sampleParticipants[1], sampleSettings);
    const svg = await renderIndividualSvg(plan, { generatedAt: at });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain(`width="${INDIVIDUAL_SIZE.width}"`);
    const png = svgToPngNode(svg, INDIVIDUAL_SIZE.width, 2);
    expect(pngSize(png)).toEqual({ width: 2480, height: 3508 });
  });

  it("kasus padat (5 paket + baseline, nama panjang) tetap ter-render", async () => {
    const plan = buildParticipantPlan(denseParticipant, sampleSettings);
    const svg = await renderIndividualSvg(plan, { generatedAt: at });
    expect(svg.length).toBeGreaterThan(10_000);
  });

  it("peserta tanpa role tetap menghasilkan gambar (dengan pesan)", async () => {
    const plan = buildParticipantPlan({ ...sampleParticipants[0], roleId: null }, sampleSettings);
    const svg = await renderIndividualSvg(plan, { generatedAt: at });
    expect(svg.startsWith("<svg")).toBe(true);
  });

  it("poster instansi A3 landscape untuk 12 dan 60 peserta", async () => {
    for (const people of [sampleParticipants, largeSample()]) {
      const inst = buildInstitutionPlan(people, sampleSettings);
      const svg = await renderInstitutionSvg(inst, { title: "Uji Poster", instansi: "Instansi Contoh" }, { generatedAt: at });
      const png = svgToPngNode(svg, INSTITUTION_SIZE.width, 1);
      expect(pngSize(png)).toEqual({ width: 2480, height: 1754 });
    }
  });
});
