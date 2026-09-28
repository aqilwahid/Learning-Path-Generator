"use client";
import { useMemo } from "react";
import { getCatalog, getRole } from "@/lib/catalog";
import { resolveRoleFromTitle } from "@/lib/engine";
import { inputCls } from "./ui";

export function RolePicker({
  id,
  value,
  onChange,
  jabatan,
}: {
  id: string;
  value: string | null;
  onChange: (roleId: string | null) => void;
  jabatan?: string;
}) {
  const catalog = getCatalog();
  const role = getRole(value);
  const suggestion = useMemo(() => resolveRoleFromTitle(jabatan ?? ""), [jabatan]);
  const suggested =
    suggestion.roleId && suggestion.roleId !== value && suggestion.confidence !== "none" && suggestion.confidence !== "ambiguous"
      ? getRole(suggestion.roleId)
      : undefined;

  return (
    <div className="flex flex-col gap-2">
      <select id={id} className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">— Pilih role target —</option>
        {catalog.functions.map((f) => (
          <optgroup key={f.id} label={f.label}>
            {catalog.roles
              .filter((r) => r.functionId === f.id)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {`${r.id} · ${r.name} (sampai Lv.${r.maxLevel})`}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      {suggested ? (
        <button
          type="button"
          onClick={() => onChange(suggested.id)}
          className="self-start rounded-full border border-brand-sky bg-mist px-3 py-1 text-xs font-bold text-brand-blue hover:bg-brand-sky"
        >
          Saran dari jabatan: {suggested.name} — pakai
          {suggestion.confidence === "weak" ? " (kurang yakin)" : ""}
        </button>
      ) : null}
      {suggestion.confidence === "ambiguous" && !value ? (
        <p className="text-xs text-warn">Jabatan ini bisa berarti beberapa role — pilih yang paling sesuai tugas sehari-hari.</p>
      ) : null}
      {role?.description ? <p className="text-xs text-muted">{role.description}</p> : null}
    </div>
  );
}
