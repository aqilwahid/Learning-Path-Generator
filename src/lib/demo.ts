// Data contoh FIKTIF untuk mencoba aplikasi ("Coba dengan data contoh").
import { newId } from "@/lib/engine";
import type { Participant } from "@/lib/model/schemas";
import { SAMPLE_INSTANSI, SAMPLE_SESSION_TITLE, sampleParticipants } from "../../samples/fixtures";

export const DEMO_SESSION = {
  title: `${SAMPLE_SESSION_TITLE} (contoh)`,
  instansi: SAMPLE_INSTANSI,
  departemen: "Bidang TIK",
};

export function demoParticipants(): Participant[] {
  const now = new Date().toISOString();
  return sampleParticipants.map((p) => ({ ...p, id: newId(), createdAt: now, updatedAt: now, source: "instruktur" as const }));
}
