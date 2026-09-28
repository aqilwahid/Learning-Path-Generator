import { readFile } from "node:fs/promises";
import type { Download, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export async function captureDownload(page: Page, action: () => Promise<unknown>): Promise<{ name: string; bytes: Buffer }> {
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 150_000 }), action()]);
  return readDownload(dl);
}

export async function readDownload(dl: Download): Promise<{ name: string; bytes: Buffer }> {
  const p = await dl.path();
  if (!p) throw new Error("Download gagal");
  return { name: dl.suggestedFilename(), bytes: await readFile(p) };
}

export function expectPng(bytes: Buffer, minKb = 50): { width: number; height: number } {
  expect(bytes.subarray(1, 4).toString("ascii")).toBe("PNG");
  expect(bytes.length).toBeGreaterThan(minKb * 1024);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

export function expectPdf(bytes: Buffer): number {
  expect(bytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  const pages = (bytes.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  return pages;
}

/**
 * Kumpulkan error halaman & respons gagal selama tes.
 * `allow` = pola URL/status yang memang diharapkan gagal (mis. passcode salah → 401).
 */
export function watchErrors(page: Page, allow: RegExp[] = []): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("response", (r) => {
    const tag = `${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`;
    if (r.status() >= 400 && !allow.some((a) => a.test(tag))) errors.push(`http: ${tag}`);
  });
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

export async function fillParticipant(page: Page, opts: { name: string; jabatan: string; roleId: string; levelLabel?: RegExp }) {
  await page.getByLabel("Nama lengkap").fill(opts.name);
  await page.getByLabel("Jabatan").fill(opts.jabatan);
  await page.getByLabel("Role target").selectOption(opts.roleId);
  if (opts.levelLabel) await page.getByText(opts.levelLabel).first().click();
}
