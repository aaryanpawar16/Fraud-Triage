import type { Metadata } from "next";
import { Source_Serif_4, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const displayFont = Source_Serif_4({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fraud Triage Agent — Case Review",
  description:
    "Evidence-based fraud triage agent, evaluated against 12 real cases. Zero wrong verdicts reached the caller unflagged.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}
    >
      <body className="bg-bg font-body text-text antialiased">
        <Nav />
        {children}
      </body>
    </html>
  );
}
