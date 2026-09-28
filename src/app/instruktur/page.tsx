import type { Metadata } from "next";
import { InstructorHome } from "@/components/instructor/InstructorHome";

export const metadata: Metadata = { title: "Instruktur" };

export default function InstrukturPage() {
  return <InstructorHome />;
}
