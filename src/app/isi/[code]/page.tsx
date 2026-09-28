import type { Metadata } from "next";
import { SelfServiceSession } from "@/components/SelfService";

export const metadata: Metadata = { title: "Isian peserta" };

export default async function IsiSesiPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <SelfServiceSession code={code.toUpperCase()} />;
}
