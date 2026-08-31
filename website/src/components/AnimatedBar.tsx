"use client";

import { useEffect, useState } from "react";

export default function AnimatedBar({
  targetPercent,
  colorClass,
}: {
  targetPercent: number;
  colorClass: string;
}) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    // Starts at 0, then on next tick jumps to target — the CSS
    // transition below is what makes that read as an animated fill
    // rather than an instant snap.
    const t = setTimeout(() => setWidth(targetPercent), 100);
    return () => clearTimeout(t);
  }, [targetPercent]);

  return (
    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
      <div
        className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
