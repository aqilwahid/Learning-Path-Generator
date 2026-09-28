"use client";
import { getCatalog, getRole, packageTopics, type Package } from "@/lib/catalog";
import { BASELINE_ROLE_ID } from "@/lib/engine";
import type { Participant } from "@/lib/model/schemas";
import { RolePicker } from "./RolePicker";
import { Checkbox, Field, inputCls } from "./ui";

type Variant = "instruktur" | "peserta";

interface Props {
  value: Participant;
  onChange: (next: Participant) => void;
  variant: Variant;
  lockInstansi?: boolean;
  errors?: Partial<Record<"name" | "roleId", string>>;
}

/** Kelompokkan paket bervarian yang punya set track sama (mis. NG-G61 & NG-G62: Oracle/MongoDB). */
function trackGroups(pkgs: Package[]) {
  const groups = new Map<string, { codes: string[]; tracks: { id: string; label: string }[] }>();
  for (const p of pkgs) {
    if (!p.tracks || p.tracks.length < 2) continue;
    const sig = p.tracks.map((t) => t.id).join("|");
    const g = groups.get(sig) ?? { codes: [], tracks: p.tracks.map((t) => ({ id: t.id, label: t.label })) };
    g.codes.push(p.code);
    groups.set(sig, g);
  }
  return [...groups.values()];
}

export function ParticipantForm({ value, onChange, variant, lockInstansi, errors }: Props) {
  const role = getRole(value.roleId);
  const set = <K extends keyof Participant>(key: K, v: Participant[K]) => onChange({ ...value, [key]: v });

  const changeRole = (roleId: string | null) => {
    onChange({ ...value, roleId, currentLevel: 0, targetLevel: null, completedCodes: [], completedTopicIds: [] });
  };

  const maxLevel = role?.maxLevel ?? 0;
  const current = Math.min(value.currentLevel, maxLevel);
  const effectiveTarget = value.targetLevel ?? Math.min(current + 1, maxLevel);
  const upcoming = role ? role.packages.filter((p) => p.level > current && p.level <= Math.max(effectiveTarget, current + 1)) : [];
  const groups = role ? trackGroups(role.packages.filter((p) => p.level > current)) : [];

  const chooseTrack = (group: { tracks: { id: string }[] }, trackId: string | null) => {
    const ids = new Set(group.tracks.map((t) => t.id));
    const rest = value.trackPrefs.filter((t) => !ids.has(t));
    set("trackPrefs", trackId ? [...rest, trackId] : rest);
  };

  const toggleTopic = (topicId: string, done: boolean) => {
    const s = new Set(value.completedTopicIds);
    if (done) s.add(topicId);
    else s.delete(topicId);
    set("completedTopicIds", [...s]);
  };

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-brand-navy">Identitas</legend>
        <div className="sm:col-span-2">
          <Field label="Nama lengkap" required error={errors?.name}>
            {(id) => (
              <input id={id} className={inputCls} value={value.name} maxLength={120} autoComplete="name" onChange={(e) => set("name", e.target.value)} />
            )}
          </Field>
        </div>
        <Field label="Jabatan" hint="Mis. Staf Jaringan, Programmer, Kepala Bidang TIK">
          {(id) => <input id={id} className={inputCls} value={value.jabatan} maxLength={160} onChange={(e) => set("jabatan", e.target.value)} />}
        </Field>
        <Field label="Departemen / unit">
          {(id) => <input id={id} className={inputCls} value={value.departemen} maxLength={160} onChange={(e) => set("departemen", e.target.value)} />}
        </Field>
        <div className="sm:col-span-2">
          <Field label="Instansi / perusahaan" hint={lockInstansi ? "Ditentukan oleh sesi instruktur." : undefined}>
            {(id) => (
              <input
                id={id}
                className={`${inputCls} disabled:bg-mist disabled:text-muted`}
                value={value.instansi}
                maxLength={160}
                disabled={lockInstansi}
                onChange={(e) => set("instansi", e.target.value)}
              />
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-brand-navy">Role & level</legend>
        <Field label="Role target" required error={errors?.roleId}>
          {(id) => <RolePicker id={id} value={value.roleId} onChange={changeRole} jabatan={value.jabatan} />}
        </Field>

        {role ? (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold text-ink">Pelatihan yang sudah diikuti untuk role ini</span>
              <div className="flex flex-col gap-2">
                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 ${current === 0 ? "border-brand-blue bg-mist" : "border-line"}`}>
                  <input type="radio" name={`lvl-${value.id}`} className="accent-[#04294b]" checked={current === 0} onChange={() => onChange({ ...value, currentLevel: 0, targetLevel: null, completedTopicIds: [] })} />
                  <span className="text-sm font-semibold">Belum pernah (Lv.0)</span>
                </label>
                {role.packages.map((p) => (
                  <label
                    key={p.code}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 ${current === p.level ? "border-brand-blue bg-mist" : "border-line"}`}
                  >
                    <input
                      type="radio"
                      name={`lvl-${value.id}`}
                      className="accent-[#04294b]"
                      checked={current === p.level}
                      onChange={() => onChange({ ...value, currentLevel: p.level, targetLevel: null, completedTopicIds: [] })}
                    />
                    <span className="text-sm">
                      <span className="font-semibold">Sampai Lv.{p.level}</span>
                      <span className="text-muted"> · {p.code} {p.title}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <Field label="Target level" hint={`${role.name} tersedia sampai Lv.${role.maxLevel}.`}>
              {(id) => (
                <select
                  id={id}
                  className={inputCls}
                  value={value.targetLevel ?? ""}
                  onChange={(e) => set("targetLevel", e.target.value ? Number(e.target.value) : null)}
                  disabled={current >= maxLevel}
                >
                  <option value="">{current >= maxLevel ? "Sudah level tertinggi" : `Otomatis — naik 1 level (Lv.${Math.min(current + 1, maxLevel)})`}</option>
                  {role.packages
                    .filter((p) => p.level > current)
                    .map((p) => (
                      <option key={p.level} value={p.level}>
                        Lv.{p.level} · {p.levelName}
                      </option>
                    ))}
                </select>
              )}
            </Field>

            {groups.length ? (
              <div className="flex flex-col gap-3">
                <span className="text-sm font-bold text-ink">Teknologi yang dipakai</span>
                {groups.map((g) => {
                  const chosen = g.tracks.find((t) => value.trackPrefs.includes(t.id))?.id ?? null;
                  return (
                    <div key={g.codes.join()} className="rounded-xl border border-line p-3">
                      <p className="mb-2 text-xs text-muted">Untuk paket {g.codes.join(", ")} — pilih satu:</p>
                      <div className="flex flex-wrap gap-2">
                        {[{ id: null as string | null, label: "Belum tahu" }, ...g.tracks].map((t) => (
                          <button
                            type="button"
                            key={t.id ?? "none"}
                            onClick={() => chooseTrack(g, t.id)}
                            aria-pressed={chosen === t.id}
                            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
                              chosen === t.id ? "border-brand-navy bg-brand-navy text-white" : "border-line bg-white text-ink hover:border-brand-blue"
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {upcoming.length ? (
              <details className="rounded-xl border border-line p-3">
                <summary className="cursor-pointer text-sm font-bold text-brand-blue">Ada topik di level berikutnya yang sudah pernah diikuti? (opsional)</summary>
                <div className="mt-3 flex flex-col gap-3">
                  {upcoming.map((p) => {
                    const trackId = p.tracks?.find((t) => value.trackPrefs.includes(t.id))?.id;
                    return (
                      <div key={p.code}>
                        <p className="mb-1 text-xs font-bold text-muted">
                          {p.code} · Lv.{p.level} {p.levelName}
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {packageTopics(p, trackId).map((t) => (
                            <label key={t.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="accent-[#04294b]"
                                checked={value.completedTopicIds.includes(t.id)}
                                onChange={(e) => toggleTopic(t.id, e.target.checked)}
                              />
                              {t.title} <span className="text-muted">· {t.days} hari</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            ) : null}
          </>
        ) : null}
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-brand-navy">Tambahan</legend>
        {value.roleId !== BASELINE_ROLE_ID ? (
          <Checkbox
            checked={value.includeBaseline}
            onChange={(v) => set("includeBaseline", v)}
            label="Tambahkan baseline Digital Skill (NG-A31)"
            description="Disarankan untuk peserta non-IT: literasi TIK, kolaborasi, keamanan, infografis."
          />
        ) : null}
        <Field label="Sertifikat yang sudah dimiliki" hint="Opsional, mis. MTCNA, BNSP Junior Web Developer">
          {(id) => <input id={id} className={inputCls} value={value.certifications} maxLength={300} onChange={(e) => set("certifications", e.target.value)} />}
        </Field>
        <Field label={variant === "instruktur" ? "Catatan instruktur" : "Catatan untuk instruktur"} hint={variant === "instruktur" ? "Muncul di gambar learning path peserta." : "Opsional."}>
          {(id) => <textarea id={id} rows={3} className={inputCls} value={value.notes} maxLength={500} onChange={(e) => set("notes", e.target.value)} />}
        </Field>
      </fieldset>
    </div>
  );
}

export function validateParticipant(p: Participant, requireRole = true): Partial<Record<"name" | "roleId", string>> {
  const errors: Partial<Record<"name" | "roleId", string>> = {};
  if (!p.name.trim()) errors.name = "Nama wajib diisi.";
  if (requireRole && !p.roleId) errors.roleId = "Pilih role target.";
  return errors;
}

export function catalogTrackLabel(id: string): string {
  return getCatalog().trackOptions.find((t) => t.id === id)?.label ?? id;
}
