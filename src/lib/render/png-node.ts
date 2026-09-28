// Hanya untuk server (API route / skrip Node). Jangan impor dari komponen client.
import { Resvg } from "@resvg/resvg-js";

/** SVG → PNG di server (Node). `scale` 2 ≈ 300 dpi untuk kanvas @150 dpi. */
export function svgToPngNode(svg: string, width: number, scale = 2): Uint8Array {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: Math.round(width * scale) },
    background: "#ffffff",
    font: { loadSystemFonts: false },
  });
  return resvg.render().asPng();
}
