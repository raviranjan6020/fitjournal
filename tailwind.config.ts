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
        background:  "rgb(249 250 251)",   // #F9FAFB
        surface:     "rgb(255 255 255)",   // #FFFFFF
        foreground:  "rgb(17 24 39)",      // #111827
        primary: {
          DEFAULT:    "rgb(0 102 255)",    // #0066FF
          foreground: "rgb(255 255 255)",
        },
        muted: {
          DEFAULT:    "rgb(243 244 246)",  // #F3F4F6
          foreground: "rgb(107 114 128)", // #6B7280
        },
        border:      "rgb(229 231 235)",   // #E5E7EB
        success: {
          DEFAULT:    "rgb(22 163 74)",    // #16A34A
          foreground: "rgb(255 255 255)",
        },
        warning: {
          DEFAULT:    "rgb(217 119 6)",    // #D97706
          foreground: "rgb(255 255 255)",
        },
        danger: {
          DEFAULT:    "rgb(220 38 38)",    // #DC2626
          foreground: "rgb(255 255 255)",
        },
      },
      borderRadius: {
        "xl":  "0.75rem",
        "2xl": "1rem",
        "3xl": "1.25rem",
        "4xl": "1.5rem",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      screens: {
        // mobile-first defaults fine; ensure max-md for bottom nav
      },
    },
  },
  plugins: [],
};

export default config;
