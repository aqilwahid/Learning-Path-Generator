"use client";
import { useEffect, useMemo, useState } from "react";
import { buildParticipantPlan } from "@/lib/engine";
import type { Participant, PlanSettings } from "@/lib/model/schemas";
import { ParticipantForm, validateParticipant } from "../ParticipantForm";
import { PlanImagePreview } from "../PlanImagePreview";
import { Alert, Button, Modal } from "../ui";

export function ParticipantEditor({
  open,
  initial,
  settings,
  sessionTitle,
  isNew,
  onSave,
  onClose,
}: {
  open: boolean;
  initial: Participant | null;
  settings: PlanSettings;
  sessionTitle: string;
  isNew: boolean;
  onSave: (p: Participant) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Participant | null>(initial);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(initial);
    setTouched(false);
    setError(null);
  }, [initial]);

  const plan = useMemo(() => (draft ? buildParticipantPlan(draft, settings) : null), [draft, settings]);
  if (!draft || !plan) return null;
  const errors = validateParticipant(draft, false);

  const save = async () => {
    setTouched(true);
    if (Object.keys(errors).length) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...draft, name: draft.name.trim() });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isNew ? "Tambah peserta" : `Ubah data — ${initial?.name ?? ""}`} wide>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-5">
          <ParticipantForm value={draft} onChange={setDraft} variant="instruktur" errors={touched ? errors : undefined} />
          {!draft.roleId ? <Alert tone="warn">Peserta tanpa role target tetap tersimpan, tetapi belum punya learning path.</Alert> : null}
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="sticky bottom-0 -mx-5 flex gap-2 border-t border-line bg-white px-5 py-3">
            <Button onClick={save} busy={saving}>
              Simpan
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Batal
            </Button>
          </div>
        </div>
        <div className="lg:sticky lg:top-0 lg:self-start">
          <PlanImagePreview plan={plan} sessionTitle={sessionTitle} />
        </div>
      </div>
    </Modal>
  );
}
