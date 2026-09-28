import type { Metadata } from "next";
import { CatalogBrowser } from "@/components/CatalogBrowser";
import { getCatalog } from "@/lib/catalog";

export const metadata: Metadata = { title: "Katalog" };

export default function KatalogPage() {
  const c = getCatalog();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-red">Katalog v{c.version}</p>
      <h1 className="mt-1 text-3xl font-extrabold text-brand-navy">{c.title}</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted">
        {c.functions.length} fungsi enterprise, {c.roles.length} job role, {c.packageByCode.size} paket level, dan {c.topicById.size} topik —
        ditranskripsi dari poster {c.program}. Pemetaan skema BNSP di bawah ini masih draf dan perlu divalidasi DPPP.
      </p>
      <div className="mt-6">
        <CatalogBrowser />
      </div>
    </div>
  );
}
