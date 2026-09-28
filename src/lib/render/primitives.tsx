/* Komponen dasar untuk template satori. Semua <div> ber-display flex (syarat satori). */
import type { CSSProperties, ReactNode } from "react";
import { FONT_FAMILY } from "./fonts";

type DivProps = { style?: CSSProperties; children?: ReactNode };

export function Row({ style, children }: DivProps) {
  return <div style={{ display: "flex", flexDirection: "row", ...style }}>{children}</div>;
}

export function Col({ style, children }: DivProps) {
  return <div style={{ display: "flex", flexDirection: "column", ...style }}>{children}</div>;
}

export function Txt({
  size = 20,
  weight = 400,
  color,
  style,
  children,
}: {
  size?: number;
  weight?: 400 | 600 | 800;
  color?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div style={{ display: "flex", fontFamily: FONT_FAMILY, fontSize: size, fontWeight: weight, color, lineHeight: 1.3, ...style }}>
      {children}
    </div>
  );
}

export function CheckIcon({ size = 20, color = "#fff", stroke = 3.2 }: { size?: number; color?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M4.5 12.5l4.8 4.8L19.5 7" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowIcon({ size = 22, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M4 12h14M13 6l6 6-6 6" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Ikon medali/sertifikat. */
export function SealIcon({ size = 22, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="9" r="6" fill="none" stroke={color} strokeWidth={2.4} />
      <path d="M8.5 13.8L7 22l5-2.6L17 22l-1.5-8.2" fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" />
    </svg>
  );
}

export function UsersIcon({ size = 22, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="3.6" fill="none" stroke={color} strokeWidth={2.2} />
      <path d="M2.5 20c.6-3.6 3.2-5.6 6.5-5.6s5.9 2 6.5 5.6" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.8" fill="none" stroke={color} strokeWidth={2} />
      <path d="M17.5 14.2c2.3.4 3.8 2 4.2 4.8" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}
