import type { Metadata } from "next";
import { SelfServiceStandalone } from "@/components/SelfService";

export const metadata: Metadata = { title: "Isi mandiri" };

export default function IsiPage() {
  return <SelfServiceStandalone />;
}
