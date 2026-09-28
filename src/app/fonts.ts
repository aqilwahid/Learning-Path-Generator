import localFont from "next/font/local";

/** Plus Jakarta Sans (SIL OFL) — dipakai lokal agar build tidak butuh akses ke Google Fonts. */
export const jakarta = localFont({
  variable: "--font-jakarta",
  display: "swap",
  src: [
    { path: "../../assets/fonts/plus-jakarta-sans-latin-400-normal.woff", weight: "400", style: "normal" },
    { path: "../../assets/fonts/plus-jakarta-sans-latin-600-normal.woff", weight: "600", style: "normal" },
    { path: "../../assets/fonts/plus-jakarta-sans-latin-800-normal.woff", weight: "800", style: "normal" },
  ],
});
