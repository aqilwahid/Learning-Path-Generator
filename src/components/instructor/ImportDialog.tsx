"use client";
import { useRef, useState } from "react";
import { getCatalog } from "@/lib/catalog";
import type { ImportResult } from "@/lib/io/import";
import type { Participant } from "@/lib/model/schemas";
import { Alert, Badge, Button, Modal, Spinner } from "../ui";

export function ImportDialog({
  open,
  onClose,
  defaultInstansi,
  existingCount,
  onImport,
  onDownloadTemplate,
}: {
  open: boolean;
  onClose: () => void;
  defaultInstansi: string;
  existingCount: number;
  onImport: (participants: Participant[], mode: "upsert" | "replace") => Promise<void>;
  onDownloadTemplate: () => void;
}) {
  const catalog = getCatalog();
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"upsert" | "replace">("upsert");

  const reset = () => {
    setResult(null);
    setFileName("");
    setError(null);
    setMode("upsert");
  };

  const pick = async (file: File) => {
    setParsing(true);
    setError(null);
    setFileName(file.name);
    try {
      const { importParticipantsFile } = await import("@/lib/io/import");
      setResult(await importParticipantsFile(file, { instansi: defaultInstansi }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membaca file.");
      setResult(null);
    } finally {
      setParsing(false);
    }
  };

  const setRole = (i: number, roleId: string | null) => {
    if (!result) return;
    const rows = [...result.rows];
    const row = rows[i];
    rows[i] = {
      ...row,
      participant: { ...row.participant, roleId, currentLevel: 0 },
      issues: row.issues.filter((x) => !x.toLowerCase().includes("role")),
      roleSource: roleId ? "kolom" : "kosong",
    };
    setResult({ ...result, rows });
  };

  const doImport = async () => {
    if (!result) return;
    setSaving(true);
    setError(null);
    try {
      await onImport(
        result.rows.map((r) => r.participant),
        mode,
      );
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan hasil impor.");
    } finally {
      setSaving(false);
    }
  };

  const needCheck = result?.rows.filter((r) => r.issues.length).length ?? 0;

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Impor peserta dari Excel / CSV"
      wide
    >
      {!result ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Gunakan template Excel dari aplikasi (sudah ada dropdown role, level, dan teknologi), atau rekap Google Form yang diunduh sebagai
            .xlsx/.csv. Minimal harus ada kolom <b>Nama</b>; role bisa ditebak dari kolom <b>Jabatan</b>.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onDownloadTemplate}>
              Unduh template Excel
            </Button>
          </div>
          <label
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-mist px-6 py-10 text-center hover:border-brand-blue"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) void pick(f);
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void pick(f);
                e.target.value = "";
              }}
            />
            {parsing ? (
              <span className="flex items-center gap-2 text-sm font-bold text-brand-navy">
                <Spinner /> Membaca {fileName}…
              </span>
            ) : (
              <>
                <span className="text-base font-extrabold text-brand-navy">Pilih atau seret file ke sini</span>
                <span className="text-xs text-muted">.xlsx atau .csv · maks. 5 MB · maks. 500 baris</span>
              </>
            )}
          </label>
          {error ? <Alert tone="error">{error}</Alert> : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone="navy">{fileName}</Badge>
            <span>
              {result.rows.length} baris terbaca (header di baris {result.headerRow})
            </span>
            {needCheck ? <Badge tone="amber">{needCheck} perlu dicek</Badge> : <Badge tone="green">Semua siap</Badge>}
          </div>
          {result.warnings.map((w) => (
            <Alert key={w} tone="warn">
              {w}
            </Alert>
          ))}
          {result.rows.length ? (
            <div className="max-h-[48dvh] overflow-auto rounded-xl border border-line">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-mist text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-3 py-2">Baris</th>
                    <th className="px-3 py-2">Nama</th>
                    <th className="px-3 py-2">Jabatan</th>
                    <th className="px-3 py-2">Role target</th>
                    <th className="px-3 py-2">Level</th>
                    <th className="px-3 py-2">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r, i) => (
                    <tr key={r.rowNumber} className={`border-t border-line ${r.issues.length ? "bg-amber-50/60" : ""}`}>
                      <td className="px-3 py-2 text-muted">{r.rowNumber}</td>
                      <td className="px-3 py-2 font-semibold">{r.participant.name}</td>
                      <td className="px-3 py-2">{r.participant.jabatan || "—"}</td>
                      <td className="px-3 py-2">
                        <select
                          aria-label={`Role untuk ${r.participant.name}`}
                          className="w-full min-w-[12rem] rounded-lg border border-line bg-white px-2 py-1 text-sm"
                          value={r.participant.roleId ?? ""}
                          onChange={(e) => setRole(i, e.target.value || null)}
                        >
                          <option value="">— pilih —</option>
                          {catalog.roles.map((ro) => (
                            <option key={ro.id} value={ro.id}>
                              {ro.label}
                            </option>
                          ))}
                        </select>
                        {r.roleSource === "jabatan" ? <span className="text-[11px] text-muted">ditebak dari jabatan</span> : null}
                      </td>
                      <td className="px-3 py-2">Lv.{r.participant.currentLevel}</td>
                      <td className="px-3 py-2 text-xs text-[#7a4f12]">{r.issues.join(" ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-1 font-bold">Cara menyimpan</legend>
            <label className="flex items-center gap-2">
              <input type="radio" className="accent-[#04294b]" checked={mode === "upsert"} onChange={() => setMode("upsert")} />
              Tambahkan ke daftar ({existingCount} peserta lama tetap ada)
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" className="accent-[#04294b]" checked={mode === "replace"} onChange={() => setMode("replace")} />
              Ganti seluruh daftar dengan isi file ini
            </label>
          </fieldset>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={doImport} busy={saving} disabled={!result.rows.length}>
              Impor {result.rows.length} peserta
            </Button>
            <Button variant="ghost" onClick={reset}>
              Pilih file lain
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
