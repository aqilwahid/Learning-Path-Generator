/**
 * Identitas yang tampil di aplikasi dan di gambar output.
 * Ubah lewat environment variable (lihat .env.example) tanpa menyentuh kode.
 */
export const BRAND = {
  appName: "NG Learning Path",
  appTagline: "Generator learning path & sertifikasi BNSP — Agile Corp: Next Generation",
  orgName: process.env.NEXT_PUBLIC_ORG_NAME || "Inixindo Jogja",
  programName: "Agile Corp: Next Generation",
};

export const COLORS = {
  red: "#C00000",
  navy: "#04294B",
  blue: "#063D71",
  sky: "#CEDDEA",
  paper: "#FFFFFF",
  mist: "#F3F6FA",
  ink: "#0F1B2D",
  muted: "#5B6B7F",
  line: "#D5DEE8",
  done: "#2E7D5B",
  doneBg: "#EEF6F1",
  doneLine: "#CFE5D8",
  warn: "#B7791F",
  level: {
    1: "#4A86C5",
    2: "#2166A8",
    3: "#0F4C8A",
    4: "#0A2F5C",
  } as Record<number, string>,
};
