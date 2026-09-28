"use client";
import { useMemo, useState } from "react";
import { getCatalog, type FunctionId, type Role } from "@/lib/catalog";
import { getBnspData, schemeDisplayName } from "@/lib/bnsp";
import { normalizeText } from "@/lib/engine";
import { Badge, inputCls, LevelChip } from "./ui";

function roleSearchText(r: Role): string {
  const parts: string[] = [r.id, r.name, r.abbr ?? "", r.description ?? ""];
  for (const p of r.packages) {
    parts.push(p.code, p.title);
    for (const t of p.topics ?? []) parts.push(t.title);
    for (const tr of p.tracks ?? []) {
      parts.push(tr.label);
      for (const t of tr.topics) parts.push(t.title);
    }
  }
  return normalizeText(parts.join(" "));
}

export function CatalogBrowser() {
  const catalog = getCatalog();
  const bnsp = getBnspData();
  const [q, setQ] = useState("");
  const [fn, setFn] = useState<FunctionId | "all">("all");

  const roles = useMemo(() => {
    const nq = normalizeText(q);
    return catalog.roles.filter((r) => {
      if (fn !== "all" && r.functionId !== fn) return false;
      if (!nq) return true;
      const hay = roleSearchText(r);
      return hay.includes(nq);
    });
  }, [catalog.roles, q, fn]);

  const matchBadge = (roleId: string) => {
    const m = bnsp.mappingByRole.get(roleId);
    if (!m || m.match === "none") return <Badge tone="gray">Belum ada skema BNSP</Badge>;
    return <Badge tone={m.match === "direct" ? "green" : "amber"}>{m.match === "direct" ? "Skema BNSP sepadan" : "Skema BNSP parsial"}</Badge>;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 md:flex-row">
        <input className={`${inputCls} md:max-w-md`} placeholder="Cari role, kode paket, atau topik… (mis. Kubernetes, NG-E82)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari katalog" />
        <div className="flex flex-wrap gap-1.5">
          {[{ id: "all" as const, label: "Semua" }, ...catalog.functions.map((f) => ({ id: f.id, label: `${f.id} · ${f.name}` }))].map((f) => (
            <button
              key={f.id}
              onClick={() => setFn(f.id)}
              aria-pressed={fn === f.id}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold ${fn === f.id ? "border-brand-navy bg-brand-navy text-white" : "border-line bg-white text-ink hover:border-brand-blue"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted">{roles.length} role ditampilkan</p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((r) => {
          const mapping = bnsp.mappingByRole.get(r.id);
          return (
            <article key={r.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
              <header className="flex items-start gap-3 bg-brand-navy px-4 py-3 text-white">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand-red text-sm font-extrabold">{r.functionId}</span>
                <div>
                  <h2 className="font-extrabold leading-tight">{r.name}</h2>
                  <p className="text-xs text-sky-200">
                    {r.id} · sampai Lv.{r.maxLevel}
                  </p>
                </div>
              </header>
              <div className="flex flex-1 flex-col gap-3 px-4 py-3">
                {r.description ? <p className="text-xs text-muted">{r.description}</p> : null}
                {r.packages.map((p) => (
                  <div key={p.code} className="rounded-xl border border-line p-3">
                    <div className="flex items-center gap-2">
                      <LevelChip level={p.level} code={p.code} />
                      <span className="text-xs font-bold text-muted">
                        Lv.{p.level} · {p.levelName}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-brand-navy">{p.title}</p>
                    {p.topics ? (
                      <ul className="mt-1 space-y-0.5 text-xs text-ink">
                        {p.topics.map((t) => (
                          <li key={t.id} className="flex justify-between gap-2">
                            <span>{t.title}</span>
                            <span className="shrink-0 text-muted">{t.days} hr</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-1 space-y-1.5">
                        {p.tracks!.map((t) => (
                          <div key={t.id}>
                            <p className="text-[11px] font-bold italic text-brand-blue">Dengan {t.label}</p>
                            <ul className="space-y-0.5 text-xs text-ink">
                              {t.topics.map((x) => (
                                <li key={x.id} className="flex justify-between gap-2">
                                  <span>{x.title}</span>
                                  <span className="shrink-0 text-muted">{x.days} hr</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                    {p.original?.note ? <p className="mt-1 text-[11px] text-warn">{p.original.note}</p> : null}
                  </div>
                ))}
                <div className="mt-auto border-t border-line pt-3">
                  {matchBadge(r.id)}
                  {mapping?.schemes.length ? (
                    <ul className="mt-2 space-y-0.5 text-xs text-ink">
                      {mapping.schemes.map((s) => (
                        <li key={s.schemeId}>
                          <span className="font-semibold">{schemeDisplayName(bnsp.schemeById.get(s.schemeId)!)}</span>
                          <span className="text-muted"> · siap uji setelah Lv.{s.readyAfterLevel}</span>
                        </li>
                      ))}
                    </ul>
                  ) : mapping?.note ? (
                    <p className="mt-2 text-xs text-muted">{mapping.note}</p>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
