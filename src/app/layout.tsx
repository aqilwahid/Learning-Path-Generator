import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { BRAND } from "@/config/brand";
import { getCatalog } from "@/lib/catalog";
import { jakarta } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: BRAND.appName, template: `%s · ${BRAND.appName}` },
  description: BRAND.appTagline,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#04294b",
  width: "device-width",
  initialScale: 1,
};

const NAV = [
  { href: "/instruktur", label: "Instruktur" },
  { href: "/isi", label: "Isi Mandiri" },
  { href: "/katalog", label: "Katalog" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const catalog = getCatalog();
  return (
    <html lang="id" className={jakarta.variable}>
      <body className="min-h-dvh flex flex-col font-sans">
        <a href="#konten" className="sr-only focus:not-sr-only focus:absolute focus:m-2 focus:rounded focus:bg-white focus:px-3 focus:py-2">
          Lompat ke konten
        </a>
        <header className="bg-brand-navy text-white">
          <div className="h-1.5 bg-brand-red" />
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
            <Link href="/" className="flex min-w-0 items-center gap-3" aria-label={`${BRAND.appName} — beranda`}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-red text-sm font-extrabold tracking-wide">NG</span>
              <span className="hidden leading-tight sm:block">
                <span className="block text-base font-extrabold">{BRAND.appName}</span>
                <span className="block text-xs text-sky-200/90">{BRAND.programName}</span>
              </span>
            </Link>
            <nav aria-label="Navigasi utama" className="flex items-center gap-0.5 overflow-x-auto text-sm font-semibold">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-lg px-2.5 py-2 text-sky-100 hover:bg-white/10 hover:text-white sm:px-3">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main id="konten" className="flex-1">
          {children}
        </main>
        <footer className="border-t border-line bg-mist text-xs text-muted">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4">
            <span>
              Katalog {catalog.program} v{catalog.version} · {BRAND.orgName}
            </span>
            <span>Rekomendasi otomatis; jadwal dan pemetaan skema BNSP bersifat indikatif.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
