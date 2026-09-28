"use client";
import { useCallback, useEffect, useState } from "react";
import type { StorageMode } from "./repo";

export interface Health {
  mode: StorageMode;
  authenticated: boolean;
  apiEnabled: boolean;
  retentionDays: number;
  notice: string | null;
}

const FALLBACK: Health = { mode: "local", authenticated: false, apiEnabled: false, retentionDays: 0, notice: null };

/** Cek mode aplikasi. Bila API tidak bisa diakses (mis. hosting statis), anggap mode lokal. */
export function useHealth() {
  const [health, setHealth] = useState<Health | null>(null);
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/health", { cache: "no-store", credentials: "same-origin" });
      setHealth(res.ok ? ((await res.json()) as Health) : FALLBACK);
    } catch {
      setHealth(FALLBACK);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return { health, loading: health === null, refresh: load };
}
