import type { Metadata } from "next";
import RingCheckClient from "@/components/RingCheckClient";

export const metadata: Metadata = {
  title: "Ring Check — Fraud Triage Agent",
  description: "Submit transactions and test cross-case device-reuse detection live.",
};

export default function RingCheckPage() {
  return <RingCheckClient />;
}
