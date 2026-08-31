import type { Metadata } from "next";
import ReviewClient from "@/components/ReviewClient";

export const metadata: Metadata = {
  title: "Review Queue — Fraud Triage Agent",
  description: "The 8 flagged cases, actionable — ground rules 4 & 5, human in the loop.",
};

export default function ReviewPage() {
  return <ReviewClient />;
}
