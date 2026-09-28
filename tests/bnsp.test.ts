import { describe, expect, it } from "vitest";
import { getBnspData } from "@/lib/bnsp";
import { getCatalog } from "@/lib/catalog";

describe("data BNSP", () => {
  const data = getBnspData();
  const catalog = getCatalog();

  it("memuat skema dan pemetaan tanpa referensi rusak", () => {
    expect(data.schemes.length).toBeGreaterThanOrEqual(54);
    for (const m of data.mappingByRole.values()) {
      for (const e of m.schemes) expect(data.schemeById.has(e.schemeId)).toBe(true);
    }
  });

  it("54 skema berasal dari daftar program nasional di halaman Sertifikasi Inixindo Jogja", () => {
    const fromList = data.schemes.filter((s) => s.sourceIds.includes("inix-sertifikasi"));
    expect(fromList).toHaveLength(54);
  });

  it("id skema unik", () => {
    const ids = data.schemes.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("semua 34 role punya entri pemetaan", () => {
    for (const role of catalog.roles) expect(data.mappingByRole.has(role.id), role.id).toBe(true);
    expect(data.mappingByRole.size).toBe(34);
  });

  it("draf pemetaan: 20 langsung, 8 parsial, 6 belum ada skema", () => {
    const count = { direct: 0, partial: 0, none: 0 };
    for (const m of data.mappingByRole.values()) count[m.match]++;
    expect(count).toEqual({ direct: 20, partial: 8, none: 6 });
    const none = [...data.mappingByRole.values()].filter((m) => m.match === "none").map((m) => m.roleId).sort();
    expect(none).toEqual(["B1", "B2", "C3", "D3", "E2", "E3"]);
  });

  it("role tanpa skema tidak punya entri skema; role lain minimal satu", () => {
    for (const m of data.mappingByRole.values()) {
      if (m.match === "none") expect(m.schemes).toHaveLength(0);
      else expect(m.schemes.length).toBeGreaterThan(0);
    }
  });

  it("readyAfterLevel tidak melebihi level tertinggi role", () => {
    for (const m of data.mappingByRole.values()) {
      const role = catalog.roleById.get(m.roleId)!;
      for (const e of m.schemes) expect(e.readyAfterLevel, `${m.roleId}/${e.schemeId}`).toBeLessThanOrEqual(role.maxLevel);
    }
  });

  it("skema klaster yang bersumber punya daftar unit", () => {
    for (const id of ["pengelolaan-layanan-ti", "pengelolaan-keamanan-informasi", "pengelolaan-data-center"]) {
      expect(data.schemeById.get(id)!.units!.length).toBeGreaterThan(0);
    }
    expect(data.schemeById.get("pengelolaan-layanan-ti")!.units).toHaveLength(6);
    expect(data.schemeById.get("pengelolaan-keamanan-informasi")!.units).toHaveLength(5);
  });
});
