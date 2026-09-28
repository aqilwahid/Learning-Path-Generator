"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildInstitutionPlan } from "@/lib/engine";
import type { Session } from "@/lib/model/schemas";
import { loadRenderer } from "../PlanImagePreview";
import { Alert, Badge, Button, Card, EmptyState, LevelChip, SectionTitle, Spinner, Stat } from "../ui";

type Job = "poster-png" | "poster-pdf" | "zip" | "pdf-all" | "xlsx";

export function ResultsTab({ session }: { session: Session }) {
  const plan = useMemo(() => buildInstitutionPlan(session.participants, session.settings), [session.participants, session.settings]);
  const meta = useMemo(() => ({ title: session.title, instansi: session.instansi, departemen: session.departemen }), [session.title, session.instansi, session.departemen]);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);
  const key = useMemo(() => JSON.stringify({ meta, p: session.participants, s: session.settings }), [meta, session.participants, session.settings]);
  const withRole = plan.plans.filter((p) => p.role).length;

  useEffect(() => {
    if (!session.participants.length) return;
    let cancelled = false;
    setRendering(true);
    const t = setTimeout(async () => {
      try {
        const mod = await loadRenderer();
        const svg = await mod.institutionSvg(plan, meta);
        if (cancelled) return;
        const url = mod.svgToObjectUrl(svg);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = url;
        setPosterUrl(url);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Gagal membuat poster.");
      } finally {
        if (!cancelled) setRendering(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const run = async (j: Job) => {
    setJob(j);
    setError(null);
    setProgress(null);
    try {
      const mod = await loadRenderer();
      const base = mod.slugify(session.title);
      const onProgress = (done: number, total: number) => setProgress({ done, total });
      if (j === "poster-png") mod.downloadBlob(await mod.institutionPng(plan, meta), `poster-instansi_${base}.png`);
      if (j === "poster-pdf") mod.downloadBlob(await mod.institutionPdf(plan, meta), `poster-instansi_${base}.pdf`);
      if (j === "zip") mod.downloadBlob(await mod.allPngZip(plan, meta, { sessionTitle: session.title }, onProgress), `learning-path_${base}.zip`);
      if (j === "pdf-all") mod.downloadBlob(await mod.combinedPdf(plan, meta, { sessionTitle: session.title }, onProgress), `learning-path_${base}.pdf`);
      if (j === "xlsx") {
        const [{ buildRecapWorkbook }, { workbookToBlob }] = await Promise.all([import("@/lib/io/recap"), import("@/lib/io/template")]);
        mod.downloadBlob(await workbookToBlob(await buildRecapWorkbook(meta, plan)), `rekap_${base}.xlsx`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat file.");
    } finally {
      setJob(null);
      setProgress(null);
    }
  };

  if (!session.participants.length) {
    return <EmptyState title="Belum ada peserta">Tambahkan peserta di tab Peserta untuk melihat rekap dan poster instansi.</EmptyState>;
  }

  const k = plan.kpi;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat value={k.participants} label="Peserta" />
        <Stat value={k.roles} label="Role target" />
        <Stat value={k.packages} label="Paket kelas" />
        <Stat value={k.personDays} label="Hari-orang" />
        <Stat value={k.classes} label="Kelas" sub={`${k.inHouseClasses} in-house · ${k.regulerClasses} reguler`} />
        <Stat value={k.bnspCandidates} label="Calon uji BNSP" />
      </div>
      {plan.warnings.map((w) => (
        <Alert key={w} tone="warn">
          {w}
        </Alert>
      ))}

      <Card>
        <SectionTitle hint="Poster A3 landscape · PNG ±225 dpi · PDF vektor">Unduh</SectionTitle>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => run("poster-png")} busy={job === "poster-png"} disabled={job !== null}>
            Poster instansi (PNG)
          </Button>
          <Button variant="secondary" onClick={() => run("poster-pdf")} busy={job === "poster-pdf"} disabled={job !== null}>
            Poster instansi (PDF)
          </Button>
          <Button variant="secondary" onClick={() => run("zip")} busy={job === "zip"} disabled={job !== null || !withRole}>
            Semua gambar (ZIP PNG)
          </Button>
          <Button variant="secondary" onClick={() => run("pdf-all")} busy={job === "pdf-all"} disabled={job !== null || !withRole}>
            PDF gabungan
          </Button>
          <Button variant="ghost" onClick={() => run("xlsx")} busy={job === "xlsx"} disabled={job !== null}>
            Rekap Excel
          </Button>
        </div>
        {progress ? (
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-mist">
              <div className="h-full bg-brand-blue transition-all" style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted">
              Membuat gambar {progress.done} dari {progress.total}…
            </p>
          </div>
        ) : null}
        <p className="mt-3 text-xs text-muted">
          ZIP berisi poster + {withRole} gambar peserta (A4 portrait). PDF gabungan: halaman 1 poster, berikutnya satu halaman per peserta.
          Semua dibuat di browser ini.
        </p>
        {error ? (
          <div className="mt-3">
            <Alert tone="error">{error}</Alert>
          </div>
        ) : null}
      </Card>

      <Card>
        <SectionTitle hint={rendering ? "memperbarui…" : undefined}>Pratinjau poster instansi</SectionTitle>
        <div className="overflow-hidden rounded-xl border border-line bg-mist">
          {posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={posterUrl} alt={`Poster learning path ${session.title}`} className="block h-auto w-full" />
          ) : (
            <div className="grid aspect-[2480/1754] place-items-center text-sm text-muted">
              <span className="flex items-center gap-2">
                <Spinner /> Menyiapkan poster…
              </span>
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <SectionTitle hint={`in-house bila min. ${session.settings.inHouseMin} peserta`}>Rencana kelas per periode</SectionTitle>
          {plan.periods.map((p) => {
            const rows = plan.cohorts.filter((c) => c.periodIndex === p.index);
            if (!rows.length) return null;
            return (
              <div key={p.index} className="mb-4">
                <p className="mb-1 text-sm font-extrabold text-brand-navy">
                  Periode {p.index + 1} · {p.label}
                </p>
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {rows.map((c) => (
                    <li key={c.key} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                      <LevelChip level={c.level} code={c.code} />
                      <span className="min-w-0 flex-1">
                        {c.title}
                        {c.trackLabel ? <span className="text-muted"> · {c.trackLabel}</span> : null}
                      </span>
                      <span className="text-muted">{c.days} hr</span>
                      <span className="font-bold">{c.participantIds.length} org</span>
                      <Badge tone={c.mode === "in-house" ? "navy" : "gray"}>
                        {c.mode === "in-house" ? "In-house" : "Reguler"}
                        {c.classCount > 1 ? ` ×${c.classCount}` : ""}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </Card>
        <Card className="self-start">
          <SectionTitle>Rekap sertifikasi BNSP</SectionTitle>
          {plan.bnspRecap.length ? (
            <ul className="divide-y divide-line text-sm">
              {plan.bnspRecap.map((b) => (
                <li key={`${b.schemeId}-${b.periodIndex}`} className="flex items-center gap-2 py-2">
                  <span className="min-w-0 flex-1 font-semibold">{b.name}</span>
                  <span className="text-xs text-muted">{b.periodIndex !== undefined ? plan.periods[b.periodIndex]?.label : ""}</span>
                  <span className="font-bold text-brand-red">{b.participantIds.length} org</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Belum ada skema yang bisa dijadwalkan pada target ini.</p>
          )}
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-[#7a4f12]">
            Pemetaan role → skema masih draf. Validasi dulu di data/bnsp/role-scheme-map.json sebelum dipakai di proposal.
          </p>
        </Card>
      </div>
    </div>
  );
}
