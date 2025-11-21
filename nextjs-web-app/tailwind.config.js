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
      screens: {
        'xs': '475px',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      animation: {
        "gentle-shift": "gentle-shift 20s ease-in-out infinite",
        "float-slow": "float-slow 15s ease-in-out infinite",
        "float-delayed": "float-delayed 18s ease-in-out infinite 3s",
        "float-gentle": "float-gentle 22s ease-in-out infinite 6s",
        "text-gradient": "text-gradient 1.5s linear infinite",
        "background-shine": "background-shine 2s linear infinite",
        shimmer: "shimmer 2s linear infinite",
        rainbow: "rainbow var(--speed, 2s) infinite linear",
      },
      keyframes: {
        "gentle-shift": {
          "0%, 100%": {
            transform: "translateX(0) translateY(0)",
            opacity: "0.3",
          },
          "50%": {
            transform: "translateX(10px) translateY(-5px)",
            opacity: "0.5",
          },
        },
        "float-slow": {
          "0%, 100%": {
            transform: "translateY(0px) scale(1)",
            opacity: "0.2",
          },
          "50%": {
            transform: "translateY(-20px) scale(1.1)",
            opacity: "0.4",
          },
        },
        "float-delayed": {
          "0%, 100%": {
            transform: "translateY(0px) translateX(0px)",
            opacity: "0.1",
          },
          "33%": {
            transform: "translateY(-15px) translateX(5px)",
            opacity: "0.3",
          },
          "66%": {
            transform: "translateY(-10px) translateX(-3px)",
            opacity: "0.2",
          },
        },
        "float-gentle": {
          "0%, 100%": {
            transform: "translateY(0px) rotate(0deg)",
            opacity: "0.15",
          },
          "50%": {
            transform: "translateY(-12px) rotate(180deg)",
            opacity: "0.35",
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
          from: {
            backgroundPosition: "0 0",
          },
          to: {
            backgroundPosition: "-200% 0",
          },
        },
        rainbow: {
          "0%": { "background-position": "0%" },
          "100%": { "background-position": "200%" },
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
