import { expect, test } from "@playwright/test";
import { expectPng, fillParticipant, watchErrors } from "./helpers";

const PASSCODE = "uji-e2e-123";

test.describe("mode cloud (penyimpanan memori)", () => {
  test("login → sesi → peserta isi via link → masuk daftar instruktur → tutup sesi", async ({ page, browser }) => {
    const errors = watchErrors(page, [/^401 POST \/api\/auth\/login$/]);
    await page.goto("/instruktur");
    await expect(page.getByRole("heading", { name: "Masuk sebagai instruktur" })).toBeVisible();
    await page.getByLabel("Passcode instruktur").fill("salah");
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page.getByText("Passcode salah.")).toBeVisible();
    await page.getByLabel("Passcode instruktur").fill(PASSCODE);
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page.getByRole("heading", { name: "Sesi learning path" })).toBeVisible();

    await page.getByLabel("Judul sesi").fill("Kelas Agile Corp Batch 7");
    await page.getByLabel("Instansi / perusahaan").fill("PT Contoh Digital");
    await page.getByRole("button", { name: "Buat sesi" }).click();
    await expect(page.getByRole("tab", { name: "Peserta (0)" })).toBeVisible();

    await page.getByRole("button", { name: "Link & QR peserta" }).click();
    await expect(page.getByAltText(/QR code sesi/).first()).toBeVisible();
    const link = (await page.locator("div.font-mono").first().textContent())!.trim();
    expect(link).toMatch(/\/isi\/[A-Z2-9]{6}$/);
    await page.keyboard.press("Escape");

    // peserta mengisi dari "HP" (konteks browser terpisah)
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, acceptDownloads: true });
    const p = await phone.newPage();
    const pErrors = watchErrors(p);
    await p.goto(link);
    await expect(p.getByRole("heading", { name: "Kelas Agile Corp Batch 7" })).toBeVisible();
    await expect(p.getByLabel("Instansi / perusahaan")).toHaveValue("PT Contoh Digital");
    await fillParticipant(p, { name: "Dewi Lestari", jabatan: "Programmer", roleId: "E8" });
    await p.getByRole("button", { name: "Kirim ke instruktur" }).click();
    await expect(p.getByText(/Terkirim ke instruktur/)).toBeVisible();
    await expect(p.getByAltText(/Pratinjau learning path Dewi Lestari/)).toBeVisible();
    await p.screenshot({ path: "test-results/peserta-hp.png", fullPage: true });

    // perbarui isian dari perangkat yang sama → tidak dobel
    await p.getByLabel("Jabatan").fill("Web Developer");
    await p.getByRole("button", { name: "Perbarui isian" }).click();
    await expect(p.getByText(/Terkirim ke instruktur/)).toBeVisible();

    await page.getByRole("button", { name: "Muat ulang" }).click();
    await expect(page.getByRole("tab", { name: "Peserta (1)" })).toBeVisible();
    await expect(page.getByRole("cell", { name: /Dewi Lestari/ })).toBeVisible();
    await expect(page.getByText("Isi mandiri").first()).toBeVisible();
    await expect(page.getByText("Web Developer").first()).toBeVisible();

    // tutup isian → peserta melihat pesan ditutup
    await page.getByRole("button", { name: "Link & QR peserta" }).click();
    await page.getByRole("button", { name: "Tutup isian peserta" }).click();
    await expect(page.getByRole("button", { name: "Buka kembali isian" })).toBeVisible();
    await p.reload();
    await expect(p.getByText(/sudah ditutup oleh instruktur/)).toBeVisible();
    await phone.close();
    expect(errors).toEqual([]);
    expect(pErrors).toEqual([]);
  });

  test("API integrasi v1: plan (JSON) & render (PNG) dengan API key", async ({ request }) => {
    const body = {
      participants: [
        { name: "Rina", jabatan: "Staf Jaringan", roleId: "G5", currentLevel: 1 },
        { name: "Andi", roleId: "E8", trackPrefs: ["reactjs"] },
      ],
      settings: { startMonth: "2027-01" },
    };
    const denied = await request.post("/api/v1/plan", { data: body });
    expect(denied.status()).toBe(401);
    const plan = await request.post("/api/v1/plan", { data: body, headers: { "x-api-key": "kunci-e2e" } });
    expect(plan.ok()).toBe(true);
    const json = await plan.json();
    expect(json.kpi.participants).toBe(2);
    expect(json.participants[0].bnsp.primary.shortName).toBe("Network Administrator Madya");

    const img = await request.post("/api/v1/render", {
      data: { kind: "individual", participant: body.participants[0], settings: body.settings },
      headers: { Authorization: "Bearer kunci-e2e" },
    });
    expect(img.headers()["content-type"]).toBe("image/png");
    expect(expectPng(Buffer.from(await img.body()))).toEqual({ width: 2480, height: 3508 });
  });
});
