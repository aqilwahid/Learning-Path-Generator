"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { demoParticipants, DEMO_SESSION } from "@/lib/demo";
import { importLocalSession } from "@/lib/store/local";
import { apiFetch, repoFor, type SessionListItem, type StorageMode } from "@/lib/store/repo";
import { useHealth } from "@/lib/store/use-health";
import { Alert, Badge, Button, Card, EmptyState, Field, inputCls, Spinner } from "../ui";
import { LoginForm } from "./LoginForm";
import { exportSessionJson } from "./exportJson";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

export function InstructorHome() {
  const { health, refresh } = useHealth();
  if (!health)
    return (
      <div className="grid min-h-[50dvh] place-items-center text-sm text-muted">
        <span className="flex items-center gap-2">
          <Spinner /> Memeriksa mode…
        </span>
      </div>
    );
  if (health.mode === "cloud" && !health.authenticated) return <LoginForm onSuccess={refresh} />;
  return <SessionList mode={health.mode} notice={health.notice} retentionDays={health.retentionDays} onLoggedOut={refresh} />;
}

function SessionList({ mode, notice, retentionDays, onLoggedOut }: { mode: StorageMode; notice: string | null; retentionDays: number; onLoggedOut: () => void }) {
  const router = useRouter();
  const repo = useMemo(() => repoFor(mode), [mode]);
  const [items, setItems] = useState<SessionListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", instansi: "", departemen: "" });
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setItems(await repo.list());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat sesi.");
      setItems([]);
    }
  }, [repo]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (e?: React.FormEvent, demo = false) => {
    e?.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const input = demo ? DEMO_SESSION : form;
      const s = await repo.create({ title: input.title.trim(), instansi: input.instansi.trim(), departemen: input.departemen.trim() });
      if (demo) await repo.putParticipants(s.id, demoParticipants(), "replace");
      router.push(`/instruktur/sesi/${s.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat sesi.");
      setCreating(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await repo.remove(id);
      setConfirmDelete(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus.");
    }
  };

  const importJson = async (file: File) => {
    try {
      importLocalSession(JSON.parse(await file.text()));
      await load();
    } catch (e) {
      setError(e instanceof Error ? `File sesi tidak valid: ${e.message}` : "File sesi tidak valid.");
    }
  };

  const logout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    onLoggedOut();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-red">Dashboard instruktur</p>
          <h1 className="mt-1 text-3xl font-extrabold text-brand-navy">Sesi learning path</h1>
          <p className="mt-1 text-sm text-muted">Satu sesi = satu kelompok peserta (instansi, departemen, atau kelas).</p>
        </div>
        <div className="flex items-center gap-2">
          {mode === "cloud" ? <Badge tone="green">Mode cloud</Badge> : <Badge tone="sky">Mode lokal</Badge>}
          {mode === "cloud" ? (
            <Button variant="ghost" onClick={logout}>
              Keluar
            </Button>
          ) : null}
        </div>
      </div>

      {mode === "local" ? (
        <div className="mt-5">
          <Alert tone="info">
            <p className="font-bold">Mode lokal — tanpa database.</p>
            <p className="mt-1">
              Sesi dan data peserta tersimpan di browser ini saja. Link/QR peserta belum aktif; peserta tetap bisa membuat gambar sendiri
              lewat halaman <Link href="/isi" className="font-bold underline">Isi Mandiri</Link>. Untuk mengumpulkan isian peserta secara
              otomatis, aktifkan Upstash Redis dan passcode instruktur (lihat README).
            </p>
            {notice ? <p className="mt-1 font-semibold">{notice}</p> : null}
          </Alert>
        </div>
      ) : retentionDays ? (
        <p className="mt-3 text-xs text-muted">Data sesi di server terhapus otomatis {retentionDays} hari setelah sesi dibuat.</p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <Card className="self-start">
          <h2 className="text-lg font-extrabold text-brand-navy">Buat sesi baru</h2>
          <form onSubmit={(e) => create(e)} className="mt-4 flex flex-col gap-4">
            <Field label="Judul sesi" required hint="Mis. TNA Bidang TIK 2027, Kelas Agile Corp Batch 3">
              {(id) => <input id={id} className={inputCls} value={form.title} maxLength={160} onChange={(e) => setForm({ ...form, title: e.target.value })} />}
            </Field>
            <Field label="Instansi / perusahaan">
              {(id) => <input id={id} className={inputCls} value={form.instansi} maxLength={160} onChange={(e) => setForm({ ...form, instansi: e.target.value })} />}
            </Field>
            <Field label="Departemen / unit (opsional)">
              {(id) => <input id={id} className={inputCls} value={form.departemen} maxLength={160} onChange={(e) => setForm({ ...form, departemen: e.target.value })} />}
            </Field>
            <Button type="submit" busy={creating} disabled={!form.title.trim()}>
              Buat sesi
            </Button>
          </form>
          <div className="mt-5 border-t border-line pt-4">
            <p className="text-sm text-muted">Baru pertama kali? Coba dengan 12 peserta fiktif.</p>
            <Button variant="secondary" className="mt-2 w-full" onClick={() => create(undefined, true)} disabled={creating}>
              Coba dengan data contoh
            </Button>
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          {error ? <Alert tone="error">{error}</Alert> : null}
          {items === null ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Spinner /> Memuat sesi…
            </p>
          ) : items.length === 0 ? (
            <EmptyState title="Belum ada sesi">Buat sesi baru di samping, atau coba dengan data contoh.</EmptyState>
          ) : (
            items.map((s) => (
              <Card key={s.id} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-extrabold text-brand-navy">{s.title}</h3>
                    {mode === "cloud" ? <Badge tone={s.open ? "green" : "gray"}>{s.open ? `Kode ${s.code}` : "Ditutup"}</Badge> : null}
                  </div>
                  <p className="text-sm text-muted">{[s.instansi, s.departemen].filter(Boolean).join(" · ") || "—"}</p>
                  <p className="mt-1 text-xs text-muted">
                    {s.participantCount} peserta · diperbarui {formatDate(s.updatedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/instruktur/sesi/${s.id}`}>
                    <Button>Buka</Button>
                  </Link>
                  {mode === "local" ? (
                    <Button variant="secondary" onClick={async () => exportSessionJson(await repo.get(s.id))}>
                      Ekspor
                    </Button>
                  ) : null}
                  {confirmDelete === s.id ? (
                    <>
                      <Button variant="danger" onClick={() => remove(s.id)}>
                        Ya, hapus
                      </Button>
                      <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
                        Batal
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" onClick={() => setConfirmDelete(s.id)}>
                      Hapus
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
          {mode === "local" ? (
            <div className="flex items-center gap-2 text-sm">
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importJson(f);
                  e.target.value = "";
                }}
              />
              <Button variant="ghost" onClick={() => fileRef.current?.click()}>
                Impor sesi (JSON)
              </Button>
              <span className="text-xs text-muted">untuk memindahkan sesi dari browser lain</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
