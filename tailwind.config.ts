import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: "hsl(var(--surface))",
        "surface-muted": "hsl(var(--surface-muted))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "#eef4fb",
          100: "#d6e4f3",
          200: "#adc9e7",
          300: "#7ea9d8",
          400: "#4d84c2",
          500: "#2c62a3",
          600: "#1c4a82",
          700: "#153a67",
          800: "#102c4f",
          900: "#0a1e38",
          950: "#061426",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          50: "#fdf8ec",
          100: "#f9edc9",
          200: "#f2da97",
          300: "#eac35d",
          400: "#e0ab35",
          500: "#c9932a",
          600: "#a67320",
          700: "#82581e",
          800: "#6b481f",
          900: "#5a3d1e",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        success: "#1f9d64",
        warning: "#e0ab35",
        danger: "#d64545",
        card: "hsl(var(--card))",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(10 30 56 / 0.04), 0 1px 3px 0 rgb(10 30 56 / 0.06)",
        panel: "0 4px 16px -4px rgb(10 30 56 / 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
