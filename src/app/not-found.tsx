import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand-red">404</p>
      <h1 className="mt-2 text-3xl font-extrabold text-brand-navy">Halaman tidak ditemukan</h1>
      <p className="mt-2 text-sm text-muted">Periksa kembali alamatnya, atau kembali ke beranda.</p>
      <Link href="/" className="mt-6 inline-block rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-bold text-white">
        Ke beranda
      </Link>
    </div>
  );
}
