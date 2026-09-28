"use client";
import { useMemo, useState } from "react";
import { getFunction } from "@/lib/catalog";
import { buildParticipantPlan, emptyParticipant, normalizeText, type ParticipantPlan } from "@/lib/engine";
import type { Participant, Session } from "@/lib/model/schemas";
import type { StorageMode } from "@/lib/store/repo";
import { spanLabel } from "@/lib/render/individual";
import { PlanImagePreview } from "../PlanImagePreview";
import { Alert, Badge, Button, EmptyState, inputCls, Modal } from "../ui";
import { ImportDialog } from "./ImportDialog";
import { ParticipantEditor } from "./ParticipantEditor";
import { QrPanel } from "./QrPanel";

const SOURCE_LABEL: Record<Participant["source"], { t: string; tone: "navy" | "sky" | "gray" }> = {
  instruktur: { t: "Instruktur", tone: "gray" },
  peserta: { t: "Isi mandiri", tone: "sky" },
  import: { t: "Impor", tone: "gray" },
};

export function ParticipantsTab({
  session,
  mode,
  onUpsert,
  onDelete,
  onUpdateSession,
  onDownloadTemplate,
}: {
  session: Session;
  mode: StorageMode;
  onUpsert: (list: Participant[], m?: "upsert" | "replace") => Promise<unknown>;
  onDelete: (pid: string) => Promise<unknown>;
  onUpdateSession: (patch: { open?: boolean }) => Promise<unknown>;
  onDownloadTemplate: () => void;
}) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<{ p: Participant; isNew: boolean } | null>(null);
  const [previewing, setPreviewing] = useState<ParticipantPlan | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const plans = useMemo(() => session.participants.map((p) => buildParticipantPlan(p, session.settings)), [session.participants, session.settings]);
  const filtered = useMemo(() => {
    const nq = normalizeText(q);
    if (!nq) return plans;
    return plans.filter((pl) => normalizeText(`${pl.participant.name} ${pl.participant.jabatan} ${pl.participant.departemen} ${pl.role?.name ?? ""}`).includes(nq));
  }, [plans, q]);
  const needCheck = plans.filter((p) => !p.role || p.steps.some((s) => s.status === "planned" && s.track?.auto)).length;

  const addNew = () =>
    setEditing({ p: emptyParticipant({ instansi: session.instansi, departemen: session.departemen, source: "instruktur" }), isNew: true });

  const remove = async (pid: string) => {
    setError(null);
    try {
      await onDelete(pid);
      setConfirmDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={addNew}>+ Tambah peserta</Button>
        <Button variant="secondary" onClick={() => setImportOpen(true)}>
          Impor Excel / CSV
        </Button>
        <Button variant="secondary" onClick={onDownloadTemplate}>
          Unduh template Excel
        </Button>
        {mode === "cloud" ? (
          <Button variant="accent" onClick={() => setQrOpen(true)}>
            Link &amp; QR peserta
          </Button>
        ) : null}
      </div>
      {mode === "local" ? (
        <p className="text-xs text-muted">Link/QR agar peserta mengisi sendiri tersedia di mode cloud (Upstash + passcode instruktur).</p>
      ) : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      {plans.length === 0 ? (
        <EmptyState title="Belum ada peserta">
          Tambahkan manual, impor dari Excel/Google Form{mode === "cloud" ? ", atau bagikan QR agar peserta mengisi sendiri" : ""}.
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted">
              <b className="text-ink">{plans.length}</b> peserta
              {needCheck ? (
                <>
                  {" · "}
                  <span className="font-bold text-warn">{needCheck} perlu dicek</span>
                </>
              ) : null}
            </p>
            <input className={`${inputCls} max-w-xs`} placeholder="Cari nama, jabatan, role…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari peserta" />
          </div>

          {/* tabel (layar lebar) */}
          <div className="hidden overflow-x-auto rounded-2xl border border-line md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-mist text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">Peserta</th>
                  <th className="px-4 py-3">Role target</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Rencana</th>
                  <th className="px-4 py-3">Skema BNSP</th>
                  <th className="px-4 py-3">Sumber</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pl) => {
                  const p = pl.participant;
                  const warn = !pl.role || pl.steps.some((s) => s.status === "planned" && s.track?.auto);
                  const src = SOURCE_LABEL[p.source];
                  return (
                    <tr key={p.id} className="border-t border-line align-top">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 font-bold text-ink">
                          {warn ? <span className="h-2 w-2 shrink-0 rounded-full bg-warn" title={pl.warnings.join("\n")} /> : null}
                          {p.name}
                        </div>
                        <div className="text-xs text-muted">{[p.jabatan, p.departemen].filter(Boolean).join(" · ") || "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        {pl.role ? (
                          <>
                            <div className="font-semibold">{pl.role.name}</div>
                            <div className="text-xs text-muted">
                              {pl.role.functionId} · {getFunction(pl.role.functionId).name}
                            </div>
                          </>
                        ) : (
                          <Badge tone="amber">Belum dipilih</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{pl.role ? `Lv.${pl.currentLevel} → Lv.${pl.targetLevel}` : "—"}</td>
                      <td className="px-4 py-3">
                        {pl.role ? (
                          <>
                            <div className="whitespace-nowrap">
                              {pl.totals.plannedPackages} paket · {pl.totals.remainingDays} hari
                            </div>
                            <div className="whitespace-nowrap text-xs text-muted">{spanLabel(pl.periods)}</div>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {pl.bnsp.primary ? (
                          <span className="text-sm">{pl.bnsp.primary.shortName}</span>
                        ) : pl.role && pl.bnsp.match === "none" ? (
                          <span className="text-xs text-muted">Belum ada skema</span>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={src.tone}>{src.t}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" className="px-2.5 py-1.5" onClick={() => setPreviewing(pl)} disabled={!pl.role}>
                            Gambar
                          </Button>
                          <Button variant="ghost" className="px-2.5 py-1.5" onClick={() => setEditing({ p, isNew: false })}>
                            Ubah
                          </Button>
                          {confirmDelete === p.id ? (
                            <Button variant="danger" className="px-2.5 py-1.5" onClick={() => remove(p.id)}>
                              Yakin?
                            </Button>
                          ) : (
                            <Button variant="ghost" className="px-2.5 py-1.5 text-brand-red" onClick={() => setConfirmDelete(p.id)}>
                              Hapus
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* kartu (layar sempit) */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((pl) => {
              const p = pl.participant;
              return (
                <div key={p.id} className="rounded-2xl border border-line p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold">{p.name}</div>
                      <div className="text-xs text-muted">{[p.jabatan, p.departemen].filter(Boolean).join(" · ") || "—"}</div>
                    </div>
                    <Badge tone={SOURCE_LABEL[p.source].tone}>{SOURCE_LABEL[p.source].t}</Badge>
                  </div>
                  <div className="mt-2 text-sm">
                    {pl.role ? (
                      <>
                        {pl.role.name} · Lv.{pl.currentLevel} → Lv.{pl.targetLevel}
                        <div className="text-xs text-muted">
                          {pl.totals.plannedPackages} paket · {pl.totals.remainingDays} hari · {spanLabel(pl.periods)}
                        </div>
                      </>
                    ) : (
                      <Badge tone="amber">Role belum dipilih</Badge>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" className="flex-1" onClick={() => setPreviewing(pl)} disabled={!pl.role}>
                      Gambar
                    </Button>
                    <Button variant="secondary" className="flex-1" onClick={() => setEditing({ p, isNew: false })}>
                      Ubah
                    </Button>
                    <Button variant="ghost" className="text-brand-red" onClick={() => (confirmDelete === p.id ? remove(p.id) : setConfirmDelete(p.id))}>
                      {confirmDelete === p.id ? "Yakin?" : "Hapus"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <ParticipantEditor
        open={Boolean(editing)}
        initial={editing?.p ?? null}
        isNew={editing?.isNew ?? false}
        settings={session.settings}
        sessionTitle={session.title}
        onSave={async (p) => {
          await onUpsert([p]);
        }}
        onClose={() => setEditing(null)}
      />

      <Modal open={Boolean(previewing)} onClose={() => setPreviewing(null)} title={`Learning path — ${previewing?.participant.name ?? ""}`}>
        {previewing ? <PlanImagePreview plan={previewing} sessionTitle={session.title} /> : null}
      </Modal>

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        defaultInstansi={session.instansi}
        existingCount={session.participants.length}
        onImport={async (list, m) => {
          await onUpsert(list, m);
        }}
        onDownloadTemplate={onDownloadTemplate}
      />

      {mode === "cloud" ? (
        <QrPanel
          open={qrOpen}
          onClose={() => setQrOpen(false)}
          session={session}
          onToggleOpen={async (next) => {
            await onUpdateSession({ open: next });
          }}
        />
      ) : null}
    </div>
  );
}
