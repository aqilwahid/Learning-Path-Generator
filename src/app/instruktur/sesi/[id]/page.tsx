import type { Metadata } from "next";
import { Workspace } from "@/components/instructor/Workspace";

export const metadata: Metadata = { title: "Sesi" };

export default async function SesiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Workspace id={id} />;
}
