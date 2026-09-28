// Membuat src/lib/render/fonts-data.ts dari assets/fonts/*.woff (base64),
// supaya font tersedia sama persis di browser dan di server tanpa akses file.
// Jalankan ulang bila file font di assets/fonts diganti: `npm run fonts:embed`.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "assets", "fonts");
const files = readdirSync(dir).filter((f) => f.endsWith(".woff")).sort();

const entries = files.map((f) => {
  const m = f.match(/-(latin(?:-ext)?)-(\d{3})-normal\.woff$/);
  if (!m) throw new Error(`Nama file font tidak dikenali: ${f}`);
  const b64 = readFileSync(join(dir, f)).toString("base64");
  return { subset: m[1], weight: Number(m[2]), b64 };
});

const body = entries
  .map((e) => `  { subset: "${e.subset}", weight: ${e.weight}, data: "${e.b64}" },`)
  .join("\n");

const out = `// FILE HASIL GENERATE — jangan diedit manual. Sumber: assets/fonts/*.woff (Plus Jakarta Sans, SIL OFL 1.1).
// Regenerasi: npm run fonts:embed
export const FONT_FAMILY = "Plus Jakarta Sans";

export const EMBEDDED_FONTS: { subset: string; weight: 400 | 600 | 800; data: string }[] = [
${body}
];
`;
writeFileSync(join(root, "src", "lib", "render", "fonts-data.ts"), out);
console.log(`[embed-fonts] ${entries.length} file font ditulis ke src/lib/render/fonts-data.ts`);
