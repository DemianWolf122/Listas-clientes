import type { Config } from "tailwindcss";

/**
 * HQ de Atrio — sistema de diseño estilo Notion.
 * Los colores semánticos viven como CSS variables (ver globals.css) para
 * soportar dark mode y opacidad (<alpha-value>). Los pastel de tags/proyectos
 * son valores fijos.
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          hover: "rgb(var(--surface-hover) / <alpha-value>)",
          active: "rgb(var(--surface-active) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--text) / <alpha-value>)",
          secondary: "rgb(var(--text-secondary) / <alpha-value>)",
          tertiary: "rgb(var(--text-tertiary) / <alpha-value>)",
        },
        hairline: {
          DEFAULT: "rgb(var(--border) / <alpha-value>)",
          strong: "rgb(var(--border-strong) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          soft: "rgb(var(--accent-soft) / <alpha-value>)",
          fg: "rgb(var(--accent-fg) / <alpha-value>)",
        },
        // prioridades
        priority: {
          urgent: "#E5624F",
          high: "#EA9A46",
          medium: "#3B7DD8",
          low: "#8B8B88",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "14px" }],
      },
      borderRadius: {
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
        xl: "10px",
        "2xl": "12px",
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(15,15,15,0.03), 0 4px 12px rgba(15,15,15,0.05)",
        card: "0 1px 2px rgba(15,15,15,0.04), 0 2px 4px rgba(15,15,15,0.03)",
        popover: "0 4px 24px rgba(15,15,15,0.10), 0 1px 3px rgba(15,15,15,0.08)",
        peek: "-10px 0 40px rgba(15,15,15,0.08)",
        float: "0 8px 30px rgba(15,15,15,0.12)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        pop: {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.25)" },
          "100%": { transform: "scale(1)" },
        },
        "overlay-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 140ms ease-out",
        "fade-in-up": "fade-in-up 160ms ease-out",
        "slide-in-right": "slide-in-right 220ms cubic-bezier(0.32, 0.72, 0, 1)",
        "scale-in": "scale-in 140ms ease-out",
        pop: "pop 320ms ease-out",
        "overlay-in": "overlay-in 160ms ease-out",
      },
      transitionTimingFunction: {
        peek: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
