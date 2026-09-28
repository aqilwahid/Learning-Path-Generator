import { describe, expect, it } from "vitest";
import { mapHeaders } from "@/lib/io/columns";
import { parseCodes, parseLevel, parseTracks, readCsv, readXlsx, rowsToParticipants } from "@/lib/io/import";
import { buildTemplateWorkbook, TEMPLATE_ROWS } from "@/lib/io/template";
import { buildRecapWorkbook } from "@/lib/io/recap";
import { buildInstitutionPlan } from "@/lib/engine";
import { sampleParticipants, sampleSettings } from "../samples/fixtures";

describe("pemetaan header", () => {
  it("mengenali header template dan Google Form", () => {
    const m = mapHeaders(["Timestamp", "Nama Lengkap", "Jabatan", "Unit Kerja", "Asal Instansi", "Role Target*", "Level Saat Ini", "Teknologi (opsional)"]);
    expect(m).toMatchObject({ name: 1, jabatan: 2, departemen: 3, instansi: 4, role: 5, currentLevel: 6, tracks: 7 });
  });

  it("'Target Level' tidak tertukar dengan 'Level Saat Ini'", () => {
    const m = mapHeaders(["Nama", "Level Saat Ini", "Target Level"]);
    expect(m.currentLevel).toBe(1);
    expect(m.targetLevel).toBe(2);
  });
});

describe("konversi nilai sel", () => {
  it("teknologi, level, dan kode paket", () => {
    expect(parseTracks("React, AWS; oracle / Proxmox VE")).toEqual(["reactjs", "aws", "oracle-db", "proxmox-ve"]);
    expect(parseLevel("2 - Intermediate")).toBe(2);
    expect(parseLevel("Belum pernah")).toBe(0);
    expect(parseLevel("Otomatis (+1 level)", false)).toBeNull();
    expect(parseCodes("ng-g51, NG-A31 dan NG-Z99")).toEqual(["NG-G51", "NG-A31"]);
  });
});

describe("impor tabel", () => {
  it("menebak role dari jabatan bila kolom role kosong, dan menandai yang ambigu", () => {
    const table = [
      ["Nama", "Jabatan", "Role Target", "Level Saat Ini"],
      ["Rina", "Staf Jaringan", "", "1 - Foundation"],
      ["Andi", "Programmer", "", ""],
      ["Sari", "Pranata Komputer Ahli Muda", "", ""],
      ["Budi", "", "E8 · Web Apps Developer", "0 - Belum pernah"],
      ["", "baris kosong diabaikan", "", ""],
    ];
    const res = rowsToParticipants(table, { instansi: "Instansi Sesi" });
    expect(res.rows).toHaveLength(4);
    const [rina, andi, sari, budi] = res.rows;
    expect(rina.participant).toMatchObject({ roleId: "G5", currentLevel: 1, instansi: "Instansi Sesi", source: "import" });
    expect(rina.roleSource).toBe("jabatan");
    expect(andi.participant.roleId).toBe("E8");
    expect(andi.issues.some((i) => i.includes("kurang yakin"))).toBe(true);
    expect(sari.participant.roleId).toBeNull();
    expect(sari.issues.some((i) => i.includes("ambigu"))).toBe(true);
    expect(budi.roleSource).toBe("kolom");
  });

  it("tanpa kolom Nama → peringatan", () => {
    expect(rowsToParticipants([["Foo", "Bar"], ["1", "2"]]).warnings[0]).toContain("Nama");
  });

  it("CSV (dengan BOM) terbaca", async () => {
    const table = await readCsv("﻿Nama,Jabatan\nRina,Admin Server\n");
    const res = rowsToParticipants(table);
    expect(res.rows[0].participant).toMatchObject({ name: "Rina", roleId: "G8" });
  });
});

describe("template Excel", () => {
  it("berisi dropdown dan bisa diimpor kembali (round-trip)", async () => {
    const wb = await buildTemplateWorkbook({ sessionTitle: "Uji" });
    const ws = wb.getWorksheet("Peserta")!;
    expect(wb.getWorksheet("Ref")!.state).toBe("veryHidden");
    // isi dua baris seperti instruktur
    ws.getRow(2).values = ["Rina Pratiwi", "Staf Jaringan", "Bidang TIK", "Dinas A", "G5 · Network Engineer", "1 - Foundation", "", "", "NG-G51", "Tidak"];
    ws.getRow(3).values = ["Andi", "Programmer", "Bidang Aplikasi", "", "E8 · Web Apps Developer", "0 - Belum pernah", "3 - Advanced", "React.js, Laravel", "", "Ya"];
    const buf = await wb.xlsx.writeBuffer();
    // dropdown benar-benar tertulis di file
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buf as ArrayBuffer);
    const sheetXml = await Promise.all(Object.keys(zip.files).filter((f) => f.startsWith("xl/worksheets/sheet")).map((f) => zip.file(f)!.async("string")));
    const withDv = sheetXml.find((x) => x.includes("<dataValidations"));
    expect(withDv).toBeDefined();
    expect((withDv!.match(/<dataValidation /g) ?? []).length).toBe(5);
    const table = await readXlsx(buf as ArrayBuffer);
    const res = rowsToParticipants(table);
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0].participant).toMatchObject({ roleId: "G5", currentLevel: 1, completedCodes: ["NG-G51"], includeBaseline: false });
    expect(res.rows[1].participant).toMatchObject({ roleId: "E8", targetLevel: 3, trackPrefs: ["reactjs", "laravel"], includeBaseline: true });
    expect(TEMPLATE_ROWS).toBe(500);
  });
});

describe("rekap Excel", () => {
  it("membuat 5 lembar rekap", async () => {
    const plan = buildInstitutionPlan(sampleParticipants, sampleSettings);
    const wb = await buildRecapWorkbook({ title: "Rekap Uji", instansi: "Dinas A" }, plan);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Ringkasan", "Peserta", "Kelas", "BNSP"]);
    expect(wb.getWorksheet("Peserta")!.rowCount).toBe(sampleParticipants.length + 1);
  });
});
