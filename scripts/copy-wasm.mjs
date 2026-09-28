// Menyalin resvg.wasm ke public/wasm agar bisa dimuat browser untuk konversi SVG → PNG.
// Dijalankan otomatis oleh `npm run dev` dan `npm run build` (predev/prebuild).
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = require.resolve("@resvg/resvg-wasm/index_bg.wasm");
const outDir = join(root, "public", "wasm");
const dest = join(outDir, "resvg.wasm");

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
copyFileSync(src, dest);
console.log(`[copy-wasm] ${src} -> public/wasm/resvg.wasm`);
