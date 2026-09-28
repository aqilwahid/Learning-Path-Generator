"use client";
import { useEffect, useState } from "react";
import type { Session } from "@/lib/model/schemas";
import { Alert, Badge, Button, Modal } from "../ui";

export function QrPanel({
  open,
  onClose,
  session,
  onToggleOpen,
}: {
  open: boolean;
  onClose: () => void;
  session: Session;
  onToggleOpen: (next: boolean) => Promise<void>;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");

  useEffect(() => {
    if (!open) return;
    const url = `${window.location.origin}/isi/${session.code}`;
    setLink(url);
    let cancelled = false;
    import("qrcode").then((QR) =>
      QR.toDataURL(url, { margin: 1, width: 720, errorCorrectionLevel: "M", color: { dark: "#04294b", light: "#ffffff" } }).then((d) => {
        if (!cancelled) setQr(d);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [open, session.code]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFullscreen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const downloadQr = () => {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr;
    a.download = `qr-sesi_${session.code}.png`;
    a.click();
  };

  const toggle = async () => {
    setBusy(true);
    try {
      await onToggleOpen(!session.open);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal open={open && !fullscreen} onClose={onClose} title="Link & QR untuk peserta">
        <div className="grid gap-5 sm:grid-cols-[240px_1fr]">
          <div className="rounded-2xl border border-line bg-white p-3">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt={`QR code sesi ${session.code}`} className="h-auto w-full" />
            ) : (
              <div className="aspect-square animate-pulse rounded-xl bg-mist" />
            )}
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Kode sesi</span>
              <span className="rounded-lg bg-brand-navy px-3 py-1 font-mono text-lg font-extrabold tracking-[0.2em] text-white">{session.code}</span>
              {session.open ? <Badge tone="green">Menerima isian</Badge> : <Badge tone="gray">Ditutup</Badge>}
            </div>
            <div className="break-all rounded-xl bg-mist px-3 py-2 font-mono text-sm text-brand-navy">{link}</div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={copy}>{copied ? "Tersalin ✓" : "Salin link"}</Button>
              <Button variant="secondary" onClick={() => setFullscreen(true)} disabled={!qr}>
                Tampilkan layar penuh
              </Button>
              <Button variant="secondary" onClick={downloadQr} disabled={!qr}>
                Unduh QR
              </Button>
            </div>
            <Alert tone="info">
              Peserta membuka link/QR ini dari HP, mengisi data, lalu isiannya masuk ke daftar peserta sesi ini (daftar dimuat ulang tiap 20
              detik). Peserta juga langsung bisa mengunduh gambar learning path miliknya.
            </Alert>
            <div className="flex items-center gap-2 border-t border-line pt-3">
              <Button variant={session.open ? "danger" : "primary"} onClick={toggle} busy={busy}>
                {session.open ? "Tutup isian peserta" : "Buka kembali isian"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
      {fullscreen ? (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-brand-navy p-6 text-white" onClick={() => setFullscreen(false)}>
          <p className="text-center text-sm font-extrabold uppercase tracking-[0.24em] text-sky-200">Pindai untuk mengisi data learning path</p>
          <h2 className="max-w-4xl text-center text-3xl font-extrabold md:text-5xl">{session.title}</h2>
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt={`QR code sesi ${session.code}`} className="w-[min(70vh,80vw)] rounded-3xl bg-white p-4" />
          ) : null}
          <p className="text-center font-mono text-xl md:text-2xl">{link}</p>
          <p className="text-xs text-sky-200">Klik di mana saja atau tekan Esc untuk menutup</p>
        </div>
      ) : null}
    </>
  );
}
