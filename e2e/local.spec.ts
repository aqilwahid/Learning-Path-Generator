import { writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import JSZip from "jszip";
import ExcelJS from "exceljs";
import { captureDownload, expectPdf, expectPng, fillParticipant, watchErrors } from "./helpers";

test.describe("mode lokal", () => {
  test("beranda & katalog", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Learning path");
    await expect(page.getByText("Mode lokal")).toBeVisible();
    await page.goto("/katalog");
    await expect(page.getByText("34 role ditampilkan")).toBeVisible();
    await page.getByLabel("Cari katalog").fill("kubernetes");
    await expect(page.getByText("1 role ditampilkan")).toBeVisible();
    await expect(page.getByRole("heading", { name: "DevOps Engineer" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("peserta isi mandiri → pratinjau → unduh PNG & PDF", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/isi");
    await fillParticipant(page, { name: "Rina Pratiwi", jabatan: "Staf Jaringan", roleId: "G5", levelLabel: /Sampai Lv\.1/ });
    await expect(page.getByAltText(/Pratinjau learning path Rina Pratiwi/)).toBeVisible();
    const png = await captureDownload(page, () => page.getByRole("button", { name: "Unduh PNG" }).click());
    expect(png.name).toBe("learning-path_rina-pratiwi.png");
    expect(expectPng(png.bytes)).toEqual({ width: 2480, height: 3508 });
    const pdf = await captureDownload(page, () => page.getByRole("button", { name: "Unduh PDF" }).click());
    expect(expectPdf(pdf.bytes)).toBe(1);
    expect(pdf.bytes.toString("latin1")).not.toContain("/Subtype /Image"); // vektor, bukan raster
    await writeFile("test-results/perorangan.pdf", pdf.bytes);
    console.log(`[ukuran] PNG perorangan ${(png.bytes.length / 1024).toFixed(0)} KB · PDF perorangan ${(pdf.bytes.length / 1024).toFixed(0)} KB`);
    await page.screenshot({ path: "test-results/isi-mandiri.png", fullPage: true });
    expect(errors).toEqual([]);
  });

  test("instruktur: data contoh → rekap → poster, ZIP, PDF gabungan, Excel", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/instruktur");
    await page.getByRole("button", { name: "Coba dengan data contoh" }).click();
    await expect(page.getByRole("tab", { name: "Peserta (12)" })).toBeVisible();
    await expect(page.getByRole("row")).toHaveCount(13);
    await page.screenshot({ path: "test-results/instruktur-peserta.png", fullPage: true });

    await page.getByRole("tab", { name: "Hasil & unduh" }).click();
    await expect(page.getByAltText(/Poster learning path/)).toBeVisible();
    await page.screenshot({ path: "test-results/instruktur-hasil.png", fullPage: true });

    const poster = await captureDownload(page, () => page.getByRole("button", { name: "Poster instansi (PNG)" }).click());
    expect(expectPng(poster.bytes)).toEqual({ width: 3720, height: 2631 });

    const zip = await captureDownload(page, () => page.getByRole("button", { name: "Semua gambar (ZIP PNG)" }).click());
    const z = await JSZip.loadAsync(zip.bytes);
    expect(Object.keys(z.files)).toHaveLength(13);

    const all = await captureDownload(page, () => page.getByRole("button", { name: "PDF gabungan" }).click());
    expect(expectPdf(all.bytes)).toBe(13);
    expect(all.bytes.toString("latin1")).not.toContain("/Subtype /Image");
    await writeFile("test-results/gabungan.pdf", all.bytes);
    console.log(
      `[ukuran] poster PNG ${(poster.bytes.length / 1024).toFixed(0)} KB · ZIP ${(zip.bytes.length / 1048576).toFixed(1)} MB · PDF gabungan 13 hlm ${(all.bytes.length / 1048576).toFixed(1)} MB`,
    );

    const xlsx = await captureDownload(page, () => page.getByRole("button", { name: "Rekap Excel" }).click());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(xlsx.bytes as unknown as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Ringkasan", "Peserta", "Kelas", "BNSP"]);
    expect(errors).toEqual([]);
  });

  test("instruktur: unduh template → isi → impor", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/instruktur");
    await page.getByLabel("Judul sesi").fill("Sesi Impor");
    await page.getByLabel("Instansi / perusahaan").fill("Dinas Uji");
    await page.getByRole("button", { name: "Buat sesi" }).click();
    await expect(page.getByRole("tab", { name: "Peserta (0)" })).toBeVisible();

    const tpl = await captureDownload(page, () => page.getByRole("button", { name: "Unduh template Excel" }).first().click());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(tpl.bytes as unknown as ArrayBuffer);
    const ws = wb.getWorksheet("Peserta")!;
    ws.getRow(2).values = ["Andi", "Programmer", "Aplikasi", "", "E8 · Web Apps Developer", "1 - Foundation", "", "React.js"];
    ws.getRow(3).values = ["Sari", "Pranata Komputer Ahli Muda", "Aplikasi"];
    ws.getRow(4).values = ["Yoga", "Admin Server", "Infrastruktur"];
    const dir = await mkdtemp(join(tmpdir(), "nglp-"));
    const file = join(dir, "peserta.xlsx");
    await writeFile(file, Buffer.from(await wb.xlsx.writeBuffer()));

    await page.getByRole("button", { name: "Impor Excel / CSV" }).click();
    await page.locator('input[type="file"][accept*=".xlsx"]').setInputFiles(file);
    await expect(page.getByText("3 baris terbaca")).toBeVisible();
    await expect(page.getByText("1 perlu dicek")).toBeVisible();
    await page.getByLabel("Role untuk Sari").selectOption("E8");
    await page.getByRole("button", { name: "Impor 3 peserta" }).click();
    await expect(page.getByRole("tab", { name: "Peserta (3)" })).toBeVisible();
    await expect(page.getByRole("cell", { name: /Yoga/ })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
