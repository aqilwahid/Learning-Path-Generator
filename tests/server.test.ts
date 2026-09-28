import { beforeEach, describe, expect, it } from "vitest";
import { createAuthToken, passcodeMatches, verifyAuthToken } from "@/lib/server/auth";
import { createMemoryStore } from "@/lib/server/store/memory";
import {
  createSession,
  getFullSession,
  publicSessionInfo,
  putParticipants,
  submitSelf,
  updateSession,
} from "@/lib/server/sessions";
import { HttpError } from "@/lib/server/http";
import { emptyParticipant } from "@/lib/engine";
import { SelfSubmissionSchema } from "@/lib/model/schemas";

const secret = "rahasia-uji";

describe("autentikasi instruktur", () => {
  it("token valid bisa diverifikasi, token diubah/kedaluwarsa ditolak", async () => {
    const t = await createAuthToken(secret, Date.now());
    expect(await verifyAuthToken(secret, t.value)).toBe(true);
    expect(await verifyAuthToken(secret, t.value.replace(/.$/, "x"))).toBe(false);
    expect(await verifyAuthToken("secret-lain", t.value)).toBe(false);
    const old = await createAuthToken(secret, Date.now() - 13 * 3600 * 1000);
    expect(await verifyAuthToken(secret, old.value)).toBe(false);
    expect(await verifyAuthToken(secret, undefined)).toBe(false);
  });

  it("pencocokan passcode", async () => {
    expect(await passcodeMatches("abc123", "abc123", secret)).toBe(true);
    expect(await passcodeMatches("abc124", "abc123", secret)).toBe(false);
    expect(await passcodeMatches("abc123", "", secret)).toBe(false);
  });
});

describe("sesi & isian peserta (memory store)", () => {
  let store = createMemoryStore();
  beforeEach(() => {
    (globalThis as { __nglpMemoryStore?: unknown }).__nglpMemoryStore = undefined;
    store = createMemoryStore();
  });

  const submission = (over: Record<string, unknown> = {}) =>
    SelfSubmissionSchema.parse({ name: "Peserta Satu", jabatan: "Staf Jaringan", roleId: "G5", ...over });

  it("membuat sesi dengan kode gabung 6 karakter dan tanggal kedaluwarsa", async () => {
    const meta = await createSession(store, { title: "Sesi Uji", instansi: "Instansi A", departemen: "" });
    expect(meta.code).toMatch(/^[A-Z2-9]{6}$/);
    expect(Date.parse(meta.expiresAt!)).toBeGreaterThan(Date.now());
    expect((await store.listSessions())[0].participantCount).toBe(0);
  });

  it("instruktur menambah peserta (upsert) dan info publik tidak memuat data peserta", async () => {
    const meta = await createSession(store, { title: "Sesi Uji", instansi: "Instansi A", departemen: "" });
    await putParticipants(store, meta.id, {
      mode: "upsert",
      participants: [emptyParticipant({ name: "A", roleId: "E8" }), emptyParticipant({ name: "B", roleId: "G5" })],
    });
    const full = await getFullSession(store, meta.id);
    expect(full.participants).toHaveLength(2);
    const info = await publicSessionInfo(store, meta.code);
    expect(info).not.toHaveProperty("participants");
    expect(info.instansi).toBe("Instansi A");
  });

  it("peserta mengisi mandiri, lalu memperbarui isiannya dengan token", async () => {
    const meta = await createSession(store, { title: "Sesi Uji", instansi: "Instansi A", departemen: "" });
    const first = await submitSelf(store, meta.code, { participant: submission() }, "1.1.1.1");
    expect(first.participant.source).toBe("peserta");
    expect(first.participant.instansi).toBe("Instansi A");
    const again = await submitSelf(
      store,
      meta.code,
      { participant: submission({ jabatan: "Admin Jaringan" }), participantId: first.participantId, editToken: first.editToken },
      "1.1.1.1",
    );
    expect(again.updated).toBe(true);
    expect(again.participantId).toBe(first.participantId);
    const full = await getFullSession(store, meta.id);
    expect(full.participants).toHaveLength(1);
    expect(full.participants[0].jabatan).toBe("Admin Jaringan");
  });

  it("token salah membuat isian baru, bukan menimpa milik orang lain", async () => {
    const meta = await createSession(store, { title: "Sesi Uji", instansi: "", departemen: "" });
    const first = await submitSelf(store, meta.code, { participant: submission() }, "1.1.1.1");
    const other = await submitSelf(store, meta.code, { participant: submission(), participantId: first.participantId, editToken: "salah" }, "2.2.2.2");
    expect(other.participantId).not.toBe(first.participantId);
    expect((await getFullSession(store, meta.id)).participants).toHaveLength(2);
  });

  it("sesi yang ditutup menolak isian", async () => {
    const meta = await createSession(store, { title: "Sesi Uji", instansi: "", departemen: "" });
    await updateSession(store, meta.id, { open: false });
    await expect(submitSelf(store, meta.code, { participant: submission() }, "1.1.1.1")).rejects.toMatchObject({ status: 403 });
  });

  it("kode tak dikenal → 404", async () => {
    await expect(publicSessionInfo(store, "ZZZZZZ")).rejects.toBeInstanceOf(HttpError);
  });

  it("pembatasan laju: kiriman ke-31 dalam 10 menit dari IP yang sama ditolak", async () => {
    const meta = await createSession(store, { title: "Sesi Uji", instansi: "", departemen: "" });
    for (let i = 0; i < 30; i++) await submitSelf(store, meta.code, { participant: submission({ name: `P${i}` }) }, "9.9.9.9");
    await expect(submitSelf(store, meta.code, { participant: submission({ name: "P31" }) }, "9.9.9.9")).rejects.toMatchObject({ status: 429 });
  });

  it("honeypot terisi ditolak oleh skema", () => {
    expect(SelfSubmissionSchema.safeParse({ name: "Bot", website: "http://spam" }).success).toBe(false);
  });
});
