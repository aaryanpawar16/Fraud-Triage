import Link from "next/link";

const LINKS = [
  { href: "/overview", label: "Overview" },
  { href: "/results", label: "Results" },
  { href: "/cases", label: "Cases" },
  { href: "/tools", label: "Tools" },
  { href: "/review", label: "Review queue" },
  { href: "/live", label: "Live demo" },
];

export default function Nav() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight text-text">
          Fraud Triage — Case Review
        </Link>
        <nav className="flex gap-6 font-mono text-xs uppercase tracking-widest2 text-text-dim">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="transition hover:text-text">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
