import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./containers/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#0a0a0a",
        charcoal: "#121212",
        graphite: "#1a1a1a",
        hairline: "#262626",
        champagne: "#d4af37",
        champagneSoft: "#e8c96a",
        zincMuted: "#71717a",
        zincBright: "#f4f4f5",
        emerald: "#10b981",
        rose: "#fb7185",
      },
    },
  },
  plugins: [],
};

export default config;
