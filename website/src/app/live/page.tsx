import type { Metadata } from "next";
import LiveClient from "@/components/LiveClient";

export const metadata: Metadata = {
  title: "Live Demo — Fraud Triage Agent",
  description: "Submit a custom transaction to the real running agent, live.",
};

export default function LivePage() {
  return <LiveClient />;
}
