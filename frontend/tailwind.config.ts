import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-jetbrains-mono)", "IBM Plex Mono", "ui-monospace"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "SFMono-Regular"],
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};

export default config;
