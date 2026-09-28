import { describe, expect, it } from "vitest";
import raw from "@data/catalog/agile-corp-ng-2025_v5.3.json";
import { RawCatalogSchema } from "@/lib/catalog/schema";
import { getCatalog } from "@/lib/catalog";

/**
 * Angka acuan diambil dari PDF "Agile Corp NG JobRole v5.3" (poster 1 halaman):
 * 7 fungsi, 34 role, 67 paket level, 124 topik, total 344 hari (termasuk semua track alternatif).
 */
describe("katalog Agile Corp NG v5.3", () => {
  const catalog = getCatalog();

  it("lolos validasi skema", () => {
    expect(() => RawCatalogSchema.parse(raw)).not.toThrow();
  });

  it("jumlah fungsi, role, paket, topik, dan hari cocok dengan PDF", () => {
    expect(catalog.functions).toHaveLength(7);
    expect(catalog.roles).toHaveLength(34);
    expect(catalog.packageByCode.size).toBe(67);
    expect(catalog.topicById.size).toBe(124);
    const totalDays = [...catalog.topicById.values()].reduce((a, t) => a + t.days, 0);
    expect(totalDays).toBe(344);
  });

  it("jumlah role per fungsi sesuai poster", () => {
    const perFn = Object.fromEntries(catalog.functions.map((f) => [f.id, 0]));
    for (const r of catalog.roles) perFn[r.functionId]++;
    expect(perFn).toEqual({ A: 3, B: 2, C: 5, D: 3, E: 10, F: 3, G: 8 });
  });

  it("distribusi level: 34 Foundation, 25 Intermediate, 6 Advanced, 2 Expert", () => {
    const perLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const p of catalog.packageByCode.values()) perLevel[p.level]++;
    expect(perLevel).toEqual({ 1: 34, 2: 25, 3: 6, 4: 2 });
  });

  it("kode paket konsisten dengan pola NG-{fungsi}{nomor role}{level}", () => {
    for (const role of catalog.roles) {
      for (const pkg of role.packages) {
        expect(pkg.code).toBe(`NG-${role.functionId}${role.number}${pkg.level}`);
        expect(pkg.roleId).toBe(role.id);
      }
      expect(role.id).toBe(`${role.functionId}${role.number}`);
    }
  });

  it("setiap role punya Foundation dan level berurutan tanpa lompatan", () => {
    for (const role of catalog.roles) {
      role.packages.forEach((p, i) => expect(p.level).toBe(i + 1));
    }
  });

  it("9 role hanya sampai Lv.1", () => {
    const onlyLv1 = catalog.roles.filter((r) => r.maxLevel === 1).map((r) => r.id).sort();
    expect(onlyLv1).toEqual(["B2", "C2", "C3", "C5", "D3", "E1", "E5", "F3", "G2"]);
  });

  it("8 paket punya Product Specifics, 6 di antaranya punya track alternatif", () => {
    const withTracks = [...catalog.packageByCode.values()].filter((p) => p.tracks);
    expect(withTracks.map((p) => p.code).sort()).toEqual(
      ["NG-E82", "NG-F31", "NG-G21", "NG-G42", "NG-G61", "NG-G62", "NG-G81", "NG-G82"].sort(),
    );
    expect(withTracks.filter((p) => p.tracks!.length > 1)).toHaveLength(6);
  });

  it("opsi track unik berjumlah 12", () => {
    expect(catalog.trackOptions.map((t) => t.label).sort()).toEqual(
      ["AWS", "Django", "GCP", "Laravel", "Linux", "Mikrotik", "MongoDB", "Oracle DB", "Proxmox VE", "React.js", "VMware", "Vue.js"].sort(),
    );
  });

  it("NG-G82 dinormalisasi ke Lv.2 dengan catatan teks asli", () => {
    const g82 = catalog.packageByCode.get("NG-G82")!;
    expect(g82.level).toBe(2);
    expect(g82.original?.levelLabel).toBe("Lv.1");
  });

  it("ID topik unik dan stabil", () => {
    expect(catalog.topicById.get("NG-E82#reactjs#1")?.title).toBe("Build Web App with Framework React.js");
    expect(catalog.topicById.get("NG-D21#main#2")?.title).toBe("Mastering Microsoft Project 2016");
  });
});
