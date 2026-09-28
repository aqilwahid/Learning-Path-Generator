"use client";
/**
 * Pembuatan gambar di browser: satori → SVG → PNG (resvg-wasm) / PDF (jsPDF + svg2pdf.js).
 * Data peserta tidak dikirim ke server untuk proses ini.
 * Modul ini dimuat dinamis (import()) agar tidak membebani halaman awal.
 */
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { jsPDF } from "jspdf";
import "svg2pdf.js";
import JSZip from "jszip";
import type { InstitutionPlan, ParticipantPlan } from "@/lib/engine";
import {
  INDIVIDUAL_SIZE,
  INSTITUTION_SIZE,
  renderIndividualSvg,
  renderInstitutionSvg,
  type InstitutionMeta,
  type RenderOptions,
} from "./svg";

export type { InstitutionMeta, RenderOptions };

// ---------- util ----------

export function slugify(s: string, fallback = "tanpa-nama"): string {
  const slug = s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || fallback;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function svgToObjectUrl(svg: string): string {
  return URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
}

// ---------- PNG ----------

let resvgReady: Promise<void> | null = null;

function ensureResvg(): Promise<void> {
  if (!resvgReady) {
    resvgReady = initWasm(fetch("/wasm/resvg.wasm")).catch((e) => {
      resvgReady = null;
      throw new Error(`Gagal memuat mesin PNG (resvg.wasm): ${e instanceof Error ? e.message : e}`);
    });
  }
  return resvgReady;
}

export async function svgToPngBytes(svg: string, width: number, scale: number): Promise<Uint8Array> {
  await ensureResvg();
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: Math.round(width * scale) },
    background: "#ffffff",
    font: { loadSystemFonts: false },
  });
  const png = resvg.render().asPng();
  resvg.free();
  return png;
}

function pngBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes as BlobPart], { type: "image/png" });
}

// ---------- PDF ----------

export interface PdfPage {
  svg: string;
  format: "a4" | "a3";
  orientation: "portrait" | "landscape";
  /** dipakai bila konversi vektor gagal */
  width: number;
}

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * satori menyematkan ikon <svg> sebagai <image href="data:image/svg+xml,…">, yang tidak dirender svg2pdf.
 * Ubah menjadi grup vektor biasa agar ikon tetap muncul di PDF.
 */
export function inlineSvgImages(root: Element): number {
  let count = 0;
  for (const img of Array.from(root.querySelectorAll("image"))) {
    const href = img.getAttribute("href") ?? img.getAttributeNS("http://www.w3.org/1999/xlink", "href") ?? "";
    if (!href.startsWith("data:image/svg+xml")) continue;
    const comma = href.indexOf(",");
    const head = href.slice(0, comma);
    const body = href.slice(comma + 1);
    let text: string;
    try {
      text = head.includes(";base64") ? atob(body) : decodeURIComponent(body);
    } catch {
      continue;
    }
    const inner = new DOMParser().parseFromString(text, "image/svg+xml").documentElement;
    if (!inner || inner.nodeName.toLowerCase() !== "svg") continue;
    const num = (el: Element, name: string, def = 0) => {
      const v = Number.parseFloat(el.getAttribute(name) ?? "");
      return Number.isFinite(v) ? v : def;
    };
    const x = num(img, "x");
    const y = num(img, "y");
    const w = num(img, "width");
    const h = num(img, "height");
    const vb = (inner.getAttribute("viewBox") ?? `0 0 ${num(inner, "width", w)} ${num(inner, "height", h)}`).split(/[\s,]+/).map(Number);
    if (vb.length !== 4 || !vb[2] || !vb[3]) continue;
    const outer = document.createElementNS(SVG_NS, "g");
    const clip = img.getAttribute("clip-path");
    if (clip) outer.setAttribute("clip-path", clip);
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("transform", `translate(${x} ${y}) scale(${w / vb[2]} ${h / vb[3]}) translate(${-vb[0]} ${-vb[1]})`);
    for (const child of Array.from(inner.childNodes)) g.appendChild(document.importNode(child, true));
    outer.appendChild(g);
    img.replaceWith(outer);
    count++;
  }
  return count;
}

async function addSvgPage(doc: jsPDF, page: PdfPage): Promise<void> {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const holder = document.createElement("div");
  holder.style.cssText = "position:fixed;left:-99999px;top:0;width:10px;height:10px;overflow:hidden;opacity:0;pointer-events:none";
  holder.innerHTML = page.svg;
  document.body.appendChild(holder);
  try {
    const el = holder.querySelector("svg");
    if (!el) throw new Error("SVG tidak valid");
    inlineSvgImages(el);
    await doc.svg(el, { x: 0, y: 0, width: pw, height: ph });
  } catch {
    // cadangan: raster resolusi tinggi
    const png = await svgToPngBytes(page.svg, page.width, 2);
    doc.addImage(png, "PNG", 0, 0, pw, ph, undefined, "FAST");
  } finally {
    holder.remove();
  }
}

type PageSource = PdfPage | (() => Promise<PdfPage>);

/** Halaman boleh berupa fungsi (dibuat saat giliran) agar hemat memori untuk banyak peserta. */
export async function svgPagesToPdf(pages: PageSource[], onProgress?: (done: number, total: number) => void): Promise<Blob> {
  if (!pages.length) throw new Error("Tidak ada halaman untuk PDF");
  let doc: jsPDF | null = null;
  for (let i = 0; i < pages.length; i++) {
    const src = pages[i];
    const page = typeof src === "function" ? await src() : src;
    if (!doc) doc = new jsPDF({ unit: "pt", format: page.format, orientation: page.orientation, compress: true });
    else doc.addPage(page.format, page.orientation);
    await addSvgPage(doc, page);
    onProgress?.(i + 1, pages.length);
    await new Promise((r) => setTimeout(r, 0)); // beri napas ke UI
  }
  return doc!.output("blob");
}

// ---------- API tingkat tinggi ----------

export const PNG_SCALE = { individual: 2, institution: 1.5 } as const;

export async function participantSvg(plan: ParticipantPlan, opts: RenderOptions = {}): Promise<string> {
  return renderIndividualSvg(plan, opts);
}

export async function participantPng(plan: ParticipantPlan, opts: RenderOptions = {}): Promise<Blob> {
  const svg = await renderIndividualSvg(plan, opts);
  return pngBlob(await svgToPngBytes(svg, INDIVIDUAL_SIZE.width, PNG_SCALE.individual));
}

export async function participantPdf(plan: ParticipantPlan, opts: RenderOptions = {}): Promise<Blob> {
  const svg = await renderIndividualSvg(plan, opts);
  return svgPagesToPdf([{ svg, format: "a4", orientation: "portrait", width: INDIVIDUAL_SIZE.width }]);
}

export async function institutionSvg(plan: InstitutionPlan, meta: InstitutionMeta, opts: RenderOptions = {}): Promise<string> {
  return renderInstitutionSvg(plan, meta, opts);
}

export async function institutionPng(plan: InstitutionPlan, meta: InstitutionMeta, opts: RenderOptions = {}): Promise<Blob> {
  const svg = await renderInstitutionSvg(plan, meta, opts);
  return pngBlob(await svgToPngBytes(svg, INSTITUTION_SIZE.width, PNG_SCALE.institution));
}

export async function institutionPdf(plan: InstitutionPlan, meta: InstitutionMeta, opts: RenderOptions = {}): Promise<Blob> {
  const svg = await renderInstitutionSvg(plan, meta, opts);
  return svgPagesToPdf([{ svg, format: "a3", orientation: "landscape", width: INSTITUTION_SIZE.width }]);
}

export function participantFileBase(plan: ParticipantPlan, index?: number): string {
  const prefix = index !== undefined ? `${String(index + 1).padStart(2, "0")}_` : "";
  return `${prefix}learning-path_${slugify(plan.participant.name)}`;
}

/** ZIP berisi poster instansi (PNG) + semua gambar peserta (PNG). */
export async function allPngZip(
  plan: InstitutionPlan,
  meta: InstitutionMeta,
  opts: RenderOptions = {},
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const zip = new JSZip();
  const withRole = plan.plans.filter((p) => p.role);
  const total = withRole.length + 1;
  zip.file(`00_poster-instansi_${slugify(meta.title)}.png`, await institutionPng(plan, meta, opts));
  onProgress?.(1, total);
  for (let i = 0; i < withRole.length; i++) {
    zip.file(`${participantFileBase(withRole[i], i)}.png`, await participantPng(withRole[i], opts));
    onProgress?.(i + 2, total);
    await new Promise((r) => setTimeout(r, 0));
  }
  return zip.generateAsync({ type: "blob", compression: "STORE" });
}

/** Satu PDF: halaman 1 poster instansi (A3 landscape), berikutnya peserta (A4 portrait). */
export async function combinedPdf(
  plan: InstitutionPlan,
  meta: InstitutionMeta,
  opts: RenderOptions = {},
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const withRole = plan.plans.filter((p) => p.role);
  const pages: PageSource[] = [
    async () => ({ svg: await renderInstitutionSvg(plan, meta, opts), format: "a3", orientation: "landscape", width: INSTITUTION_SIZE.width }),
    ...withRole.map(
      (p) => async (): Promise<PdfPage> => ({ svg: await renderIndividualSvg(p, opts), format: "a4", orientation: "portrait", width: INDIVIDUAL_SIZE.width }),
    ),
  ];
  return svgPagesToPdf(pages, onProgress);
}
