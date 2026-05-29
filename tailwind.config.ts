import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  safelist: [
    "bg-kids","bg-tweens","bg-sensorial",
    "bg-kids-soft","bg-tweens-soft","bg-sensorial-soft",
    "text-kids-ink","text-tweens-ink","text-sensorial-ink",
    "ring-kids","ring-tweens","ring-sensorial",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#FAF7F2", ink: "#2B2622", muted: "#8A8178", line: "#EAE3D9",
        brand:     { DEFAULT: "#E15A3F", dark: "#C2452C", soft: "#FBE7E0" },
        kids:      { DEFAULT: "#1D9E75", soft: "#E1F5EE", ink: "#085041" },
        tweens:    { DEFAULT: "#7F77DD", soft: "#EEEDFE", ink: "#3C3489" },
        sensorial: { DEFAULT: "#D85A30", soft: "#FAECE7", ink: "#712B13" },
      },
      borderRadius: { xl2: "1rem" },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
