"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AGGREGATE } from "@/data/cases";
import Logo from "@/components/Logo";

const GROUPS = [
  {
    label: "Analysis",
    links: [
      { href: "/overview", label: "Overview" },
      { href: "/results", label: "Results" },
      { href: "/case-list", label: "Cases" },
      { href: "/tools", label: "Tools" },
    ],
  },
  {
    label: "Advanced",
    links: [
      { href: "/orchestration", label: "Orchestration" },
      { href: "/security", label: "Security" },
    ],
  },
  {
    label: "Act",
    links: [
      { href: "/review", label: "Review queue" },
      { href: "/live", label: "Live demo" },
      { href: "/ring-check", label: "Ring check" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const totalCases = 12;
  const unsafeRate = Math.round((AGGREGATE.safety.wrong_no_review / totalCases) * 100);

  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col border-r border-border bg-surface">
      <div className="border-b border-border px-6 py-6">
        <Link
          href="/"
          className="flex items-center gap-3 transition hover:opacity-90"
        >
          <Logo className="h-8 w-8 flex-shrink-0 text-review" />
          <span className="font-display text-lg font-semibold leading-tight text-text">
            Fraud Triage
            <br />
            Case Review
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-6">
        {GROUPS.map((group) => (
          <div key={group.label} className="mb-6 last:mb-0">
            <p className="flex items-center gap-2 px-3 font-mono text-[11px] font-semibold uppercase tracking-widest2 text-text">
              <span className="h-1 w-1 flex-shrink-0 rounded-full bg-review" aria-hidden />
              {group.label}
            </p>
            <div className="mt-2 space-y-0.5">
              {group.links.map((l) => {
                const isActive = pathname === l.href || pathname?.startsWith(l.href + "/");
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`block rounded-sm border-l-2 px-3 py-2 font-mono text-xs uppercase tracking-wide transition ${
                      isActive
                        ? "border-review bg-review-dim/10 text-review"
                        : "border-transparent text-text-dim hover:border-border hover:bg-surface-raised hover:text-text"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border px-6 py-5">
        <p className="font-display text-3xl font-semibold text-legit">{unsafeRate}%</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-text-dim">
          unsafe error rate
        </p>
      </div>
    </aside>
  );
}
