import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["system-ui", "ui-sans-serif", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#2563eb",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#f3f4f6",
        },
      },

      keyframes: {
        wiggle: {
          "0%, 100%": { transform: "rotate(0deg) translateY(0)" },
          "15%": { transform: "rotate(-8deg) translateY(-1px)" },
          "30%": { transform: "rotate(8deg) translateY(-1px)" },
          "45%": { transform: "rotate(-6deg) translateY(0px)" },
          "60%": { transform: "rotate(6deg) translateY(0px)" },
          "75%": { transform: "rotate(-3deg) translateY(0px)" },
        },
      },
      animation: {
        wiggle: "wiggle 450ms ease-in-out",
      },
    },
  },
  plugins: [],
};

module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
};

export default config;
