import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        darkBg: "#0B0E14",
        cardBg: "rgba(17, 22, 32, 0.75)",
        glassBorder: "rgba(255, 255, 255, 0.08)",
        web3Green: "#00E676",
        web3Blue: "#00E5FF",
        web3Purple: "#7C4DFF",
        web3Gold: "#FFD600",
        web3TextPrimary: "#FFFFFF",
        web3TextSecondary: "#90A4AE",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "web3-gradient": "linear-gradient(135deg, #00E5FF 0%, #7C4DFF 100%)",
        "card-gradient": "linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)",
      },
      boxShadow: {
        "glass-inset": "inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)",
        "neon-glow": "0 0 15px rgba(0, 229, 255, 0.4)",
        "neon-green": "0 0 15px rgba(0, 230, 118, 0.4)",
      },
    },
  },
  plugins: [],
};
export default config;
