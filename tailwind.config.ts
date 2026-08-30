import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-raised": "var(--color-surface-raised)",
        border: "var(--color-border)",
        text: "var(--color-text)",
        "text-dim": "var(--color-text-dim)",
        fraud: "var(--color-fraud)",
        "fraud-dim": "var(--color-fraud-dim)",
        legit: "var(--color-legit)",
        "legit-dim": "var(--color-legit-dim)",
        review: "var(--color-review)",
        "review-dim": "var(--color-review-dim)",
        info: "var(--color-info)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      letterSpacing: {
        widest2: "0.16em",
      },
    },
  },
  plugins: [],
};

export default config;
