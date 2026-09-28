"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ParticipantPlan } from "@/lib/engine";
import { Alert, Button, Spinner } from "./ui";

type RenderModule = typeof import("@/lib/render/client");

let modPromise: Promise<RenderModule> | null = null;
export function loadRenderer(): Promise<RenderModule> {
  if (!modPromise) modPromise = import("@/lib/render/client");
  return modPromise;
}

/** Pratinjau gambar learning path perorangan + tombol unduh PNG/PDF. Dibuat di browser. */
export function PlanImagePreview({
  plan,
  sessionTitle,
  showWarnings = true,
}: {
  plan: ParticipantPlan;
  sessionTitle?: string;
  showWarnings?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null);
  const urlRef = useRef<string | null>(null);
  const key = useMemo(() => JSON.stringify({ p: plan.participant, s: plan.periods.map((x) => x.label), sessionTitle, st: plan.steps.map((s) => [s.code, s.status, s.periodIndex, s.track?.id]) }), [plan, sessionTitle]);

  useEffect(() => {
    let cancelled = false;
    setRendering(true);
    const t = setTimeout(async () => {
      try {
        const mod = await loadRenderer();
        const svg = await mod.participantSvg(plan, { sessionTitle });
        if (cancelled) return;
        const next = mod.svgToObjectUrl(svg);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = next;
        setUrl(next);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Gagal membuat pratinjau.");
      } finally {
        if (!cancelled) setRendering(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const download = async (kind: "png" | "pdf") => {
    setBusy(kind);
    setError(null);
    try {
      const mod = await loadRenderer();
      const blob = kind === "png" ? await mod.participantPng(plan, { sessionTitle }) : await mod.participantPdf(plan, { sessionTitle });
      mod.downloadBlob(blob, `${mod.participantFileBase(plan)}.${kind}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengunduh.");
    } finally {
      setBusy(null);
    }
  };

  const canDownload = Boolean(plan.role) && Boolean(plan.participant.name.trim());

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-mist">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`Pratinjau learning path ${plan.participant.name || "peserta"}`} className="block h-auto w-full" />
        ) : (
          <div className="grid aspect-[1240/1754] place-items-center text-sm text-muted">Menyiapkan pratinjau…</div>
        )}
        {rendering && url ? (
          <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-brand-navy shadow">
            <Spinner /> memperbarui
          </div>
        ) : null}
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => download("png")} busy={busy === "png"} disabled={!canDownload || busy !== null}>
          Unduh PNG
        </Button>
        <Button variant="secondary" onClick={() => download("pdf")} busy={busy === "pdf"} disabled={!canDownload || busy !== null}>
          Unduh PDF
        </Button>
      </div>
      {!canDownload ? <p className="text-xs text-muted">Isi nama dan pilih role target untuk mengunduh.</p> : null}
      {showWarnings && plan.warnings.length ? (
        <ul className="list-disc space-y-1 rounded-xl bg-amber-50 px-6 py-3 text-xs text-[#7a4f12]">
          {plan.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
