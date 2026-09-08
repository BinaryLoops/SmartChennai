import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: "#0B0E14", // page background
          elevated: "#10141C", // section/panel background
          card: "#151A24", // card surface
        },
        border: {
          DEFAULT: "rgba(255,255,255,0.06)",
          strong: "rgba(255,255,255,0.12)",
        },
        text: {
          primary: "#E5E7EB",
          secondary: "#8B92A5",
          muted: "#5B6272",
        },
        accent: {
          cyan: "#22D3EE",
          amber: "#F59E0B",
          red: "#EF4444",
          green: "#22C55E",
        },
      },
      borderRadius: {
        card: "16px",
      },
      boxShadow: {
        glow: "0 0 24px rgba(34, 211, 238, 0.25)",
      },
      keyframes: {
        pulseRing: {
          "0%": { transform: "scale(0.9)", opacity: "0.8" },
          "70%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
      animation: {
        "pulse-ring": "pulseRing 1.8s cubic-bezier(0.4,0,0.6,1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
