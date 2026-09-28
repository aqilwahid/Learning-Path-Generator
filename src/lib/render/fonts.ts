import { EMBEDDED_FONTS, FONT_FAMILY } from "./fonts-data";

export { FONT_FAMILY };

export interface SatoriFont {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 600 | 800;
  style: "normal";
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(b64, "base64");
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  }
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

let cache: SatoriFont[] | null = null;

/** Font untuk satori: subset latin + latin-ext (untuk nama dengan diakritik) di tiga ketebalan. */
export function getSatoriFonts(): SatoriFont[] {
  if (!cache) {
    // latin didahulukan; latin-ext menjadi cadangan untuk glyph yang tidak ada di latin
    const sorted = [...EMBEDDED_FONTS].sort((a, b) => (a.subset === b.subset ? 0 : a.subset === "latin" ? -1 : 1));
    cache = sorted.map((f) => ({ name: FONT_FAMILY, data: base64ToArrayBuffer(f.data), weight: f.weight, style: "normal" }));
  }
  return cache;
}
