const {
  default: flattenColorPalette,
} = require("tailwindcss/lib/util/flattenColorPalette");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      animation: {
        aurora: "aurora 15s linear infinite",
        "text-gradient": "text-gradient 1.5s linear infinite",
        "background-shine": "background-shine 2s linear infinite",
        shimmer: "shimmer 2s linear infinite",
        rainbow: "rainbow var(--speed, 2s) infinite linear",
        "pulse-width": "pulse-width 1.5s ease-in-out infinite",
      },
      keyframes: {
        aurora: {
          "0%": {
            transform: "translate(0, 0) scale(1)",
          },
          "33%": {
            transform: "translate(-50%, 50%) scale(1.2)",
          },
          "66%": {
            transform: "translate(50%, 50%) scale(0.9)",
          },
          "100%": {
            transform: "translate(0, 0) scale(1)",
          },
        },
        "text-gradient": {
          to: {
            backgroundPosition: "200% center",
          },
        },
        "background-shine": {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        shimmer: {
          "0%": {
            backgroundPosition: "0% 0%",
          },
          "50%": {
            backgroundPosition: "100% 0%",
          },
          "100%": {
            backgroundPosition: "0% 0%",
          },
        },
        rainbow: {
          "0%": { "background-position": "0%" },
          "100%": { "background-position": "200%" },
        },
        "pulse-width": {
          "0%, 100%": { width: "0%" },
          "50%": { width: "100%" },
        },
      },
      colors: {
        transparent: 'transparent',
        white: '#ffffff',
        black: '#000000',
        "color-1": "hsl(var(--color-1))",
        "color-2": "hsl(var(--color-2))",
        "color-3": "hsl(var(--color-3))",
        "color-4": "hsl(var(--color-4))",
        "color-5": "hsl(var(--color-5))",
      },
    },
  },
  plugins: [addVariablesForColors],
};

// This plugin adds each Tailwind color as a global CSS variable, e.g. var(--gray-200).
function addVariablesForColors({ addBase, theme }) {
  let allColors = flattenColorPalette(theme("colors"));
  let newVars = Object.fromEntries(
    Object.entries(allColors).map(([key, val]) => [`--${key}`, val])
  );

  addBase({
    ":root": newVars,
  });
}
