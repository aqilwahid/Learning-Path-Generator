import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";

export const MAX_BODY_BYTES = 2 * 1024 * 1024;

export function json(data: unknown, status = 200, headers?: Record<string, string>): NextResponse {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export function fail(status: number, message: string, details?: unknown): NextResponse {
  return json({ error: message, ...(details ? { details } : {}) }, status);
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** Baca & validasi body JSON dengan batas ukuran. */
export async function readJson<T extends z.ZodTypeAny>(req: NextRequest, schema: T): Promise<z.infer<T>> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY_BYTES) throw new HttpError(413, "Data terlalu besar.");
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, "Data terlalu besar.");
  let raw: unknown;
  try {
    raw = text ? JSON.parse(text) : {};
  } catch {
    throw new HttpError(400, "Body bukan JSON yang valid.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new HttpError(
      422,
      "Data tidak valid.",
      parsed.error.issues.slice(0, 20).map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }
  return parsed.data;
}

export function handleError(e: unknown): NextResponse {
  if (e instanceof HttpError) return fail(e.status, e.message, e.details);
  console.error("[api]", e);
  return fail(500, "Terjadi kesalahan di server.");
}

export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
