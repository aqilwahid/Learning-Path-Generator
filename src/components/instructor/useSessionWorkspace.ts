"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Participant, Session } from "@/lib/model/schemas";
import { ApiError, repoFor, type SessionPatch, type StorageMode } from "@/lib/store/repo";

const POLL_MS = 20_000;

/** Muat & ubah satu sesi. Mode cloud: muat ulang otomatis tiap 20 detik agar isian peserta via QR ikut tampil. */
export function useSessionWorkspace(id: string, mode: StorageMode | null) {
  const repo = useMemo(() => (mode ? repoFor(mode) : null), [mode]);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastLoaded, setLastLoaded] = useState<Date | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!repo) return;
      try {
        const s = await repo.get(id);
        setSession(s);
        setLastLoaded(new Date());
        if (!silent) setError(null);
      } catch (e) {
        if (!silent || (e instanceof ApiError && e.status === 401)) setError(e as Error);
      }
    },
    [repo, id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (mode !== "cloud") return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, POLL_MS);
    return () => clearInterval(t);
  }, [mode, load]);

  const run = useCallback(async (fn: () => Promise<Session>) => {
    setSaving(true);
    try {
      const s = await fn();
      setSession(s);
      setLastLoaded(new Date());
      setError(null);
      return s;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    repo,
    session,
    error,
    saving,
    lastLoaded,
    reload: () => load(),
    update: (patch: SessionPatch) => run(() => repo!.update(id, patch)),
    putParticipants: (list: Participant[], m: "upsert" | "replace" = "upsert") => run(() => repo!.putParticipants(id, list, m)),
    deleteParticipant: (pid: string) => run(() => repo!.deleteParticipant(id, pid)),
    removeSession: () => repo!.remove(id),
  };
}
