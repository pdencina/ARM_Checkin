import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  safelist: [
    "bg-kids","bg-tweens","bg-sensorial",
    "bg-kids-soft","bg-tweens-soft","bg-sensorial-soft",
    "text-kids-ink","text-tweens-ink","text-sensorial-ink",
    "ring-kids","ring-tweens","ring-sensorial",
    "border-l-kids","border-l-tweens","border-l-sensorial",
  ],
  theme: {
    extend: {
      colors: {
        /* Fondo y superficies */
        paper: "#F4F6F9",      /* fondo general */
        white: "#FFFFFF",
        ink:   "#1A2433",      /* texto principal */
        muted: "#7A8799",      /* texto secundario */
        line:  "#E3E7EE",      /* bordes */

        /* ARM Brand — azul marino */
        brand: {
          DEFAULT: "#1A3A5C",  /* navy: botones, activos */
          dark:    "#0D2236",  /* hover de botones */
          soft:    "#EBF2FA",  /* fondos suaves activos */
          blue:    "#2563EB",  /* links, focus rings */
        },

        /* Ministerios — versiones más sobrias */
        kids: {
          DEFAULT: "#0A8F63",
          soft:    "#E3F5EE",
          ink:     "#065E41",
        },
        tweens: {
          DEFAULT: "#6B4FA8",
          soft:    "#F0ECFB",
          ink:     "#4A3278",
        },
        sensorial: {
          DEFAULT: "#B34A0D",
          soft:    "#FBF0E8",
          ink:     "#7A3208",
        },

        /* Semánticos */
        danger: { DEFAULT: "#B02A20", soft: "#FEF2F2" },
      },
      borderRadius: {
        xl2: "8px",   /* antes 1rem — ahora más contenido */
        xl3: "12px",  /* para cards grandes */
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        label: "0.06em",
      },
    },
  },
  plugins: [],
};
export default config;
