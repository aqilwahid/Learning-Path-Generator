"use client";
import { useEffect, useState } from "react";
import { getCatalog } from "@/lib/catalog";
import { PERIOD_MONTH_OPTIONS, type PlanSettings, type Session } from "@/lib/model/schemas";
import type { SessionPatch, StorageMode } from "@/lib/store/repo";
import { Alert, Button, Card, Checkbox, Field, inputCls, SectionTitle } from "../ui";
import { exportSessionJson } from "./exportJson";

export function SettingsTab({
  session,
  mode,
  onSave,
  onDeleteSession,
}: {
  session: Session;
  mode: StorageMode;
  onSave: (patch: SessionPatch) => Promise<unknown>;
  onDeleteSession: () => Promise<void>;
}) {
  const catalog = getCatalog();
  const [meta, setMeta] = useState({ title: session.title, instansi: session.instansi, departemen: session.departemen });
  const [s, setS] = useState<PlanSettings>(session.settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setMeta({ title: session.title, instansi: session.instansi, departemen: session.departemen });
    setS(session.settings);
  }, [session.id, session.title, session.instansi, session.departemen, session.settings]);

  const num = (v: string, min: number, max: number, def: number) => {
    const n = Number.parseInt(v, 10);
    return Number.isNaN(n) ? def : Math.min(max, Math.max(min, n));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await onSave({ ...meta, settings: s });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const toggleTrack = (id: string) =>
    setS({ ...s, defaultTrackPrefs: s.defaultTrackPrefs.includes(id) ? s.defaultTrackPrefs.filter((x) => x !== id) : [...s.defaultTrackPrefs, id] });

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <SectionTitle>Identitas sesi</SectionTitle>
        <div className="flex flex-col gap-4">
          <Field label="Judul sesi" required>
            {(id) => <input id={id} className={inputCls} value={meta.title} maxLength={160} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />}
          </Field>
          <Field label="Instansi / perusahaan" hint="Dipakai sebagai instansi default peserta dan judul poster.">
            {(id) => <input id={id} className={inputCls} value={meta.instansi} maxLength={160} onChange={(e) => setMeta({ ...meta, instansi: e.target.value })} />}
          </Field>
          <Field label="Departemen / unit">
            {(id) => <input id={id} className={inputCls} value={meta.departemen} maxLength={160} onChange={(e) => setMeta({ ...meta, departemen: e.target.value })} />}
          </Field>
        </div>

        <div className="mt-6">
          <SectionTitle hint="Berlaku untuk paket yang punya varian produk">Profil teknologi default</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {catalog.trackOptions.map((t) => {
              const on = s.defaultTrackPrefs.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleTrack(t.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${on ? "border-brand-navy bg-brand-navy text-white" : "border-line bg-white hover:border-brand-blue"}`}
                  title={`Dipakai di ${t.packageCodes.join(", ")}`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted">Pilihan teknologi di data peserta tetap didahulukan. Tanpa pilihan, track pertama dipakai dan ditandai &ldquo;otomatis&rdquo;.</p>
        </div>
      </Card>

      <Card>
        <SectionTitle>Aturan jadwal &amp; kelas</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mulai bulan">
            {(id) => <input id={id} type="month" className={inputCls} value={s.startMonth} onChange={(e) => e.target.value && setS({ ...s, startMonth: e.target.value })} />}
          </Field>
          <Field label="Panjang periode">
            {(id) => (
              <select id={id} className={inputCls} value={s.periodMonths} onChange={(e) => setS({ ...s, periodMonths: Number(e.target.value) as PlanSettings["periodMonths"] })}>
                {PERIOD_MONTH_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m === 3 ? "3 bulan (triwulan)" : m === 6 ? "6 bulan (semester)" : `${m} bulan`}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Maks. hari pelatihan per peserta per bulan">
            {(id) => <input id={id} type="number" min={1} max={20} className={inputCls} value={s.maxDaysPerMonth} onChange={(e) => setS({ ...s, maxDaysPerMonth: num(e.target.value, 1, 20, 5) })} />}
          </Field>
          <Field label="Kelas in-house bila minimal (peserta)">
            {(id) => <input id={id} type="number" min={1} max={200} className={inputCls} value={s.inHouseMin} onChange={(e) => setS({ ...s, inHouseMin: num(e.target.value, 1, 200, 5) })} />}
          </Field>
          <Field label="Maks. peserta per kelas">
            {(id) => <input id={id} type="number" min={1} max={200} className={inputCls} value={s.maxClassSize} onChange={(e) => setS({ ...s, maxClassSize: num(e.target.value, 1, 200, 20) })} />}
          </Field>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Checkbox
            checked={s.onePackagePerPeriod}
            onChange={(v) => setS({ ...s, onePackagePerPeriod: v })}
            label="Satu level per periode"
            description="Beri jeda praktik antarlevel. Matikan untuk jadwal padat (beberapa level dalam satu periode bila kapasitas cukup)."
          />
          <Checkbox
            checked={s.baselineForAll}
            onChange={(v) => setS({ ...s, baselineForAll: v })}
            label="Baseline Digital Skill untuk semua peserta"
            description="Menambahkan NG-A31 di periode pertama bagi semua peserta (kecuali role Digital Skill)."
          />
          <Checkbox
            checked={s.includeBnsp}
            onChange={(v) => setS({ ...s, includeBnsp: v })}
            label="Tampilkan rekomendasi sertifikasi BNSP"
            description="Pemetaan skema masih draf — tandai di gambar sampai divalidasi DPPP."
          />
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
        <Button onClick={save} busy={saving} disabled={!meta.title.trim()}>
          Simpan pengaturan
        </Button>
        {saved ? <span className="text-sm font-bold text-done">Tersimpan</span> : null}
        {error ? <Alert tone="error">{error}</Alert> : null}
      </div>

      <Card className="lg:col-span-2">
        <SectionTitle>Data sesi</SectionTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => exportSessionJson(session)}>
            Ekspor sesi (JSON)
          </Button>
          {confirmDelete ? (
            <>
              <Button variant="danger" onClick={onDeleteSession}>
                Ya, hapus sesi &amp; seluruh data peserta
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                Batal
              </Button>
            </>
          ) : (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Hapus sesi
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted">
          {mode === "cloud"
            ? `Data tersimpan di server dan terhapus otomatis pada ${session.expiresAt ? new Date(session.expiresAt).toLocaleDateString("id-ID") : "tanggal kedaluwarsa"}.`
            : "Data hanya tersimpan di browser ini. Ekspor JSON untuk cadangan atau memindahkan ke perangkat lain."}
        </p>
      </Card>
    </div>
  );
}
