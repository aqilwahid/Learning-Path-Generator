// Autentikasi instruktur: passcode → cookie bertanda tangan HMAC-SHA256 (Web Crypto).
import type { NextRequest, NextResponse } from "next/server";
import { getServerConfig } from "./config";

export const AUTH_COOKIE = "nglp_auth";
const TTL_HOURS = 12;

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Bandingkan passcode tanpa membocorkan panjang/isinya lewat waktu eksekusi. */
export async function passcodeMatches(input: string, passcode: string, secret: string): Promise<boolean> {
  if (!passcode) return false;
  const [a, b] = await Promise.all([hmac(secret, `pc:${input}`), hmac(secret, `pc:${passcode}`)]);
  return safeEqual(a, b);
}

export async function createAuthToken(secret: string, now = Date.now()): Promise<{ value: string; maxAge: number }> {
  const exp = now + TTL_HOURS * 3600 * 1000;
  const payload = String(exp);
  return { value: `${payload}.${await hmac(secret, payload)}`, maxAge: TTL_HOURS * 3600 };
}

export async function verifyAuthToken(secret: string, token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token || !secret) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const exp = Number(payload);
  if (!Number.isFinite(exp) || exp < now) return false;
  return safeEqual(sig, await hmac(secret, payload));
}

export async function isInstructor(req: NextRequest): Promise<boolean> {
  const cfg = getServerConfig();
  if (!cfg.cloudReady) return false;
  return verifyAuthToken(cfg.secret, req.cookies.get(AUTH_COOKIE)?.value);
}

export function setAuthCookie(res: NextResponse, value: string, maxAge: number): void {
  res.cookies.set(AUTH_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export function clearAuthCookie(res: NextResponse): void {
  res.cookies.set(AUTH_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
}

/** API key untuk integrasi (n8n): header `x-api-key` atau `Authorization: Bearer`. */
export async function hasValidApiKey(req: NextRequest): Promise<boolean> {
  const cfg = getServerConfig();
  if (!cfg.apiKey) return false;
  const given = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!given) return false;
  const secret = cfg.secret || cfg.apiKey;
  const [a, b] = await Promise.all([hmac(secret, `ak:${given}`), hmac(secret, `ak:${cfg.apiKey}`)]);
  return safeEqual(a, b);
}
