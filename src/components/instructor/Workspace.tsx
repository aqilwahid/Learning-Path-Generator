"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/store/repo";
import { useHealth } from "@/lib/store/use-health";
import { Alert, Badge, Button, Spinner, Tabs } from "../ui";
import { LoginForm } from "./LoginForm";
import { ParticipantsTab } from "./ParticipantsTab";
import { ResultsTab } from "./ResultsTab";
import { SettingsTab } from "./SettingsTab";
import { useSessionWorkspace } from "./useSessionWorkspace";

type Tab = "peserta" | "hasil" | "pengaturan";

export function Workspace({ id }: { id: string }) {
  const router = useRouter();
  const { health, refresh } = useHealth();
  const mode = health ? health.mode : null;
  const ws = useSessionWorkspace(id, health && (health.mode === "local" || health.authenticated) ? health.mode : null);
  const [tab, setTab] = useState<Tab>("peserta");
  const [templateBusy, setTemplateBusy] = useState(false);

  if (!health) return <Loading text="Memeriksa mode…" />;
  if (health.mode === "cloud" && (!health.authenticated || (ws.error instanceof ApiError && ws.error.status === 401))) {
    return <LoginForm onSuccess={refresh} />;
  }
  if (ws.error && !ws.session) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Alert tone="error">{ws.error.message}</Alert>
        <Link href="/instruktur" className="mt-4 inline-block text-sm font-bold text-brand-blue hover:underline">
          ← Kembali ke daftar sesi
        </Link>
      </div>
    );
  }
  const session = ws.session;
  if (!session || !mode) return <Loading text="Memuat sesi…" />;

  const downloadTemplate = async () => {
    setTemplateBusy(true);
    try {
      const [{ buildTemplateWorkbook, workbookToBlob }, mod] = await Promise.all([import("@/lib/io/template"), import("@/lib/render/client")]);
      const blob = await workbookToBlob(await buildTemplateWorkbook({ sessionTitle: session.title, instansi: session.instansi }));
      mod.downloadBlob(blob, `template-peserta_${mod.slugify(session.title)}.xlsx`);
    } finally {
      setTemplateBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link href="/instruktur" className="text-sm font-bold text-brand-blue hover:underline">
        ← Semua sesi
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold text-brand-navy">{session.title}</h1>
          <p className="text-sm text-muted">{[session.instansi, session.departemen].filter(Boolean).join(" · ") || "—"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mode === "cloud" ? (
            <>
              <Badge tone={session.open ? "green" : "gray"}>{session.open ? `Kode ${session.code} · menerima isian` : "Isian ditutup"}</Badge>
              <Button variant="ghost" onClick={() => ws.reload()}>
                Muat ulang
              </Button>
              {ws.lastLoaded ? (
                <span className="text-xs text-muted">diperbarui {ws.lastLoaded.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
              ) : null}
            </>
          ) : (
            <Badge tone="sky">Mode lokal</Badge>
          )}
          {ws.saving || templateBusy ? <Spinner className="text-brand-blue" /> : null}
        </div>
      </div>
      {ws.error && ws.session ? (
        <div className="mt-3">
          <Alert tone="error">{ws.error.message}</Alert>
        </div>
      ) : null}

      <div className="mt-5">
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "peserta", label: `Peserta (${session.participants.length})` },
            { id: "hasil", label: "Hasil & unduh" },
            { id: "pengaturan", label: "Pengaturan" },
          ]}
        />
      </div>

      <div className="mt-5">
        {tab === "peserta" ? (
          <ParticipantsTab
            session={session}
            mode={mode}
            onUpsert={ws.putParticipants}
            onDelete={ws.deleteParticipant}
            onUpdateSession={ws.update}
            onDownloadTemplate={downloadTemplate}
          />
        ) : tab === "hasil" ? (
          <ResultsTab session={session} />
        ) : (
          <SettingsTab
            session={session}
            mode={mode}
            onSave={ws.update}
            onDeleteSession={async () => {
              await ws.removeSession();
              router.push("/instruktur");
            }}
          />
        )}
      </div>
    </div>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <div className="grid min-h-[50dvh] place-items-center text-sm text-muted">
      <span className="flex items-center gap-2">
        <Spinner /> {text}
      </span>
    </div>
  );
}
