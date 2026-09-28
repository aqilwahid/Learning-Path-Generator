"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/store/repo";
import { Alert, Button, Card, Field, inputCls } from "../ui";

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ passcode }) });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <Card>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-red">Mode cloud</p>
        <h1 className="mt-1 text-2xl font-extrabold text-brand-navy">Masuk sebagai instruktur</h1>
        <p className="mt-2 text-sm text-muted">Data peserta tersimpan di server, jadi dashboard dilindungi passcode instruktur.</p>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
          <Field label="Passcode instruktur" required>
            {(id) => (
              <input id={id} type="password" autoComplete="current-password" className={inputCls} value={passcode} onChange={(e) => setPasscode(e.target.value)} />
            )}
          </Field>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Button type="submit" busy={busy} disabled={!passcode}>
            Masuk
          </Button>
        </form>
      </Card>
    </div>
  );
}
