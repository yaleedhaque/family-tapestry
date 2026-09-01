import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tapestry: {
          bg: "var(--tapestry-bg)",
          "bg-alt": "var(--tapestry-bg-alt)",
        },
        thread: {
          gold: "var(--thread-gold)",
          "gold-dim": "var(--thread-gold-dim)",
        },
        ember: {
          red: "var(--ember-red)",
        },
        divorce: {
          red: "var(--divorce-red)",
        },
        parchment: {
          DEFAULT: "var(--parchment)",
          dim: "var(--parchment-dim)",
        },
        living: {
          glow: "var(--living-glow)",
        },
        deceased: {
          frame: "var(--deceased-frame)",
        },
        accent: {
          emerald: "var(--accent-emerald)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
