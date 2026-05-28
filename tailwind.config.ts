import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF7F2",
        ink: "#2B2622",
        muted: "#8A8178",
        line: "#EAE3D9",
        brand: { DEFAULT: "#E15A3F", dark: "#C2452C", soft: "#FBE7E0" },
        kids: { DEFAULT: "#0F9E78", soft: "#E1F5EE", ink: "#085041" },
        tweens: { DEFAULT: "#6D5BD0", soft: "#EEEDFE", ink: "#3C3489" },
      },
      borderRadius: { xl2: "1rem" },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
