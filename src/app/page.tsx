import Link from "next/link";
import { ModeBadge } from "@/components/ModeBadge";
import { getCatalog } from "@/lib/catalog";

export default function HomePage() {
  const c = getCatalog();
  const stats = [
    { v: c.functions.length, l: "fungsi enterprise" },
    { v: c.roles.length, l: "job role" },
    { v: c.packageByCode.size, l: "paket level" },
    { v: c.topicById.size, l: "topik pelatihan" },
  ];
  return (
    <div>
      <section className="bg-brand-navy text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-14 pt-10 md:grid-cols-[1.3fr_1fr] md:pt-16">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-sky-200">Learning Path Generator</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight md:text-5xl">
              Learning path &amp; sertifikasi BNSP, jadi satu gambar per peserta.
            </h1>
            <p className="mt-4 max-w-xl text-base text-sky-100">
              Kumpulkan data peserta, pilih role dari katalog {c.program}, lalu unduh gambar learning path (PNG/PDF) untuk tiap orang
              dan poster rekap untuk instansi.
            </p>
            <div className="mt-6">
              <ModeBadge />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 self-end">
            {stats.map((s) => (
              <div key={s.l} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-4">
                <div className="text-3xl font-extrabold">{s.v}</div>
                <div className="text-xs font-bold uppercase tracking-wider text-sky-200">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-8 grid max-w-6xl gap-4 px-4 md:grid-cols-2">
        <Link href="/instruktur" className="group rounded-3xl border border-line bg-white p-6 shadow-sm transition hover:border-brand-blue hover:shadow-md">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-red">Untuk instruktur</span>
          <h2 className="mt-2 text-2xl font-extrabold text-brand-navy">Kelola sesi &amp; peserta</h2>
          <p className="mt-2 text-sm text-muted">
            Unggah Excel/rekap Google Form atau ketik langsung, bagikan QR agar peserta mengisi sendiri, lalu unduh semua gambar dan
            poster instansi sekaligus.
          </p>
          <span className="mt-4 inline-flex text-sm font-bold text-brand-blue group-hover:underline">Buka dashboard instruktur →</span>
        </Link>
        <Link href="/isi" className="group rounded-3xl border border-line bg-white p-6 shadow-sm transition hover:border-brand-blue hover:shadow-md">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-red">Untuk peserta</span>
          <h2 className="mt-2 text-2xl font-extrabold text-brand-navy">Isi mandiri</h2>
          <p className="mt-2 text-sm text-muted">
            Isi data diri dan pelatihan yang sudah diikuti, pilih role target, dan langsung dapat gambar learning path pribadi.
          </p>
          <span className="mt-4 inline-flex text-sm font-bold text-brand-blue group-hover:underline">Mulai isi →</span>
        </Link>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-sm font-extrabold uppercase tracking-[0.16em] text-brand-navy">Cara kerja</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            ["Kumpulkan data", "Nama, jabatan, departemen, role target, dan level pelatihan yang sudah diikuti."],
            ["Mesin merekomendasikan", "Paket NG berurutan per level, track sesuai teknologi, jadwal per periode, dan skema BNSP yang sepadan."],
            ["Unduh gambar", "PNG resolusi tinggi atau PDF siap cetak — per peserta, poster instansi, atau semuanya dalam satu ZIP/PDF."],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-2xl border border-line bg-mist p-5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-red text-sm font-extrabold text-white">{i + 1}</span>
              <h3 className="mt-3 font-extrabold text-brand-navy">{t}</h3>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-muted">
          Ingin melihat seluruh katalog?{" "}
          <Link href="/katalog" className="font-bold text-brand-blue hover:underline">
            Buka katalog interaktif
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
