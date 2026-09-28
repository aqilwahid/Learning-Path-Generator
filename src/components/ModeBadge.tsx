"use client";
import { useHealth } from "@/lib/store/use-health";

export function ModeBadge() {
  const { health } = useHealth();
  if (!health) return <span className="text-xs text-muted">Memeriksa mode…</span>;
  return health.mode === "cloud" ? (
    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-done">
      <span className="h-2 w-2 rounded-full bg-done" /> Mode cloud aktif — link/QR peserta tersedia
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 rounded-full bg-mist px-3 py-1 text-xs font-bold text-brand-navy" title={health.notice ?? undefined}>
      <span className="h-2 w-2 rounded-full bg-brand-blue" /> Mode lokal — data tersimpan di browser ini
    </span>
  );
}
