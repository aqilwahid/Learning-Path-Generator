"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buildParticipantPlan, defaultSettings, emptyParticipant } from "@/lib/engine";
import { ParticipantSchema, type Participant, type PlanSettings } from "@/lib/model/schemas";
import { apiFetch, ApiError } from "@/lib/store/repo";
import { ParticipantForm, validateParticipant } from "./ParticipantForm";
import { PlanImagePreview } from "./PlanImagePreview";
import { Alert, Button, Card, Spinner } from "./ui";

function readJsonLS<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJsonLS(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* penyimpanan browser tidak tersedia — abaikan */
  }
}

function Layout({ form, preview, header }: { form: React.ReactNode; preview: React.ReactNode; header: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {header}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card>{form}</Card>
        <div id="pratinjau" className="lg:sticky lg:top-4 lg:self-start">
          {preview}
        </div>
      </div>
    </div>
  );
}

// ---------------- mode mandiri (tanpa sesi) ----------------

const DRAFT_KEY = "nglp:draft:self:v1";

export function SelfServiceStandalone() {
  const [participant, setParticipant] = useState<Participant>(() => emptyParticipant({ source: "peserta" }));
  const [settings] = useState<PlanSettings>(() => defaultSettings());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const draft = readJsonLS<unknown>(DRAFT_KEY);
    const parsed = ParticipantSchema.safeParse(draft);
    if (parsed.success) setParticipant(parsed.data);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => writeJsonLS(DRAFT_KEY, participant), 400);
    return () => clearTimeout(t);
  }, [participant, loaded]);

  const plan = useMemo(() => buildParticipantPlan(participant, settings), [participant, settings]);
  const errors = validateParticipant(participant);

  return (
    <Layout
      header={
        <>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-red">Isi mandiri</p>
          <h1 className="mt-1 text-3xl font-extrabold text-brand-navy">Learning path pribadi Anda</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Isi data di bawah — gambar di sebelah kanan langsung menyesuaikan. Data tidak dikirim ke mana pun; gambar dibuat di browser
            ini. Jika instruktur memberi link/QR sesi, gunakan link tersebut agar isian Anda masuk ke daftar instruktur.
          </p>
        </>
      }
      form={
        <div className="flex flex-col gap-6">
          <ParticipantForm value={participant} onChange={setParticipant} variant="peserta" errors={participant.name || participant.roleId ? errors : undefined} />
          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <a href="#pratinjau" className="lg:hidden">
              <Button type="button">Lihat gambar</Button>
            </a>
            <Button type="button" variant="ghost" onClick={() => setParticipant(emptyParticipant({ source: "peserta" }))}>
              Mulai ulang
            </Button>
          </div>
        </div>
      }
      preview={<PlanImagePreview plan={plan} />}
    />
  );
}

// ---------------- mode sesi (link/QR dari instruktur) ----------------

interface PublicSession {
  code: string;
  title: string;
  instansi: string;
  departemen: string;
  open: boolean;
  settings: PlanSettings;
}

interface SubmitMemo {
  participantId: string;
  editToken: string;
  participant: Participant;
  at: string;
}

export function SelfServiceSession({ code }: { code: string }) {
  const [session, setSession] = useState<PublicSession | null>(null);
  const [loadError, setLoadError] = useState<{ status: number; message: string } | null>(null);
  const [participant, setParticipant] = useState<Participant>(() => emptyParticipant({ source: "peserta" }));
  const [memo, setMemo] = useState<SubmitMemo | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const memoKey = `nglp:submit:${code}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch<{ session: PublicSession }>(`/api/public/sessions/${encodeURIComponent(code)}`);
        if (cancelled) return;
        setSession(res.session);
        const saved = readJsonLS<SubmitMemo>(memoKey);
        const parsed = saved ? ParticipantSchema.safeParse(saved.participant) : null;
        if (saved && parsed?.success) {
          setMemo(saved);
          setParticipant({ ...parsed.data, instansi: parsed.data.instansi || res.session.instansi });
        } else {
          setParticipant((p) => ({ ...p, instansi: res.session.instansi, departemen: p.departemen || res.session.departemen }));
        }
      } catch (e) {
        if (!cancelled) setLoadError({ status: e instanceof ApiError ? e.status : 0, message: e instanceof Error ? e.message : "Gagal memuat sesi." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, memoKey]);

  const settings = session?.settings ?? defaultSettings();
  const plan = useMemo(() => buildParticipantPlan(participant, settings), [participant, settings]);
  const errors = validateParticipant(participant);

  const submit = async () => {
    setTouched(true);
    if (Object.keys(errors).length) return;
    setSending(true);
    setSendError(null);
    try {
      const { id: _id, source: _s, createdAt: _c, updatedAt: _u, ...fields } = participant;
      const res = await apiFetch<{ participantId: string; editToken: string; participant: Participant; updated: boolean }>(
        `/api/public/sessions/${encodeURIComponent(code)}/submit`,
        {
          method: "POST",
          body: JSON.stringify({ participant: { ...fields, website: "" }, participantId: memo?.participantId, editToken: memo?.editToken }),
        },
      );
      const next: SubmitMemo = { participantId: res.participantId, editToken: res.editToken, participant: res.participant, at: new Date().toISOString() };
      writeJsonLS(memoKey, next);
      setMemo(next);
      setParticipant(res.participant);
      setJustSent(true);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Gagal mengirim.");
    } finally {
      setSending(false);
    }
  };

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Alert tone={loadError.status === 404 ? "warn" : "error"}>
          <p className="font-bold">{loadError.status === 503 ? "Link peserta belum aktif" : "Sesi tidak bisa dibuka"}</p>
          <p className="mt-1">{loadError.message}</p>
        </Alert>
        <p className="mt-4 text-sm text-muted">
          Anda tetap bisa membuat gambar learning path sendiri lewat{" "}
          <Link href="/isi" className="font-bold text-brand-blue hover:underline">
            halaman isi mandiri
          </Link>
          .
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="grid min-h-[50dvh] place-items-center text-sm text-muted">
        <span className="flex items-center gap-2">
          <Spinner /> Memuat sesi…
        </span>
      </div>
    );
  }

  return (
    <Layout
      header={
        <>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-red">Sesi {session.code}</p>
          <h1 className="mt-1 text-3xl font-extrabold text-brand-navy">{session.title}</h1>
          <p className="mt-1 text-sm text-muted">{[session.instansi, session.departemen].filter(Boolean).join(" · ")}</p>
          {!session.open ? (
            <div className="mt-4">
              <Alert tone="warn">Sesi ini sudah ditutup oleh instruktur. Anda masih bisa melihat dan mengunduh gambar, tetapi isian tidak bisa dikirim.</Alert>
            </div>
          ) : memo ? (
            <div className="mt-4">
              <Alert tone="success">
                {justSent ? "Terkirim ke instruktur. " : "Anda sudah pernah mengirim isian dari perangkat ini. "}
                Perubahan berikutnya akan memperbarui isian yang sama.
              </Alert>
            </div>
          ) : null}
        </>
      }
      form={
        <div className="flex flex-col gap-6">
          <ParticipantForm value={participant} onChange={(p) => { setParticipant(p); setJustSent(false); }} variant="peserta" lockInstansi={Boolean(session.instansi)} errors={touched ? errors : undefined} />
          {sendError ? <Alert tone="error">{sendError}</Alert> : null}
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <Button type="button" variant="accent" onClick={submit} busy={sending} disabled={!session.open}>
              {memo ? "Perbarui isian" : "Kirim ke instruktur"}
            </Button>
            <a href="#pratinjau" className="lg:hidden">
              <Button type="button" variant="secondary">
                Lihat gambar
              </Button>
            </a>
            <span className="text-xs text-muted">Data dipakai instruktur untuk menyusun rencana pelatihan instansi.</span>
          </div>
        </div>
      }
      preview={<PlanImagePreview plan={plan} sessionTitle={session.title} />}
    />
  );
}
