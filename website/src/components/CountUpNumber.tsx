"use client";

import { useEffect, useState } from "react";

export default function CountUpNumber({
  target,
  duration = 900,
  className = "",
}: {
  target: number;
  duration?: number;
  className?: string;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    let frame: number;

    function step(timestamp: number) {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setValue(Math.round(progress * target));
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    }
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return <span className={className}>{value}</span>;
}
