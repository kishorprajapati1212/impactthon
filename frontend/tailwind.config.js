import colors from "tailwindcss/colors";

/**
 * Palette notes (light theme is the default; dark only via the toggle).
 *
 * Phase 12 tuned the light end of `slate` so borders were visible — but it did
 * it by greying everything (grey canvas, warm off-white cards, grey borders),
 * which reads as dull: nothing is white, nothing is dark, every surface sits
 * in the same mid-grey band.
 *
 * Phase 18 — the light theme is rebuilt the way crisp SaaS consoles do it:
 *  - cards are PURE white (#ffffff) and carry a soft two-layer shadow,
 *  - the page canvas is a light, slightly cool tint (#f3f5f9) so white cards
 *    lift off it instead of blending in,
 *  - borders are cool and still clearly visible (#d9e0ea on white),
 *  - text is darker with a navy undertone (700 = #273146) for real contrast,
 *  - muted text stays readable (400 = #76829a passes AA on white at 14 px).
 * Only 50–700 are re-tuned; 800–950 are stock so the dark theme is untouched.
 * Pale "-400" accent text (cyan/emerald/rose/amber) is darkened for light mode
 * once, in index.css, instead of touching ~50 call sites.
 */
const slate = {
  50: "#f3f5f9",   // page canvas — airy, cool, clearly lighter than borders, clearly not white
  100: "#e9edf3",  // hover rows, chips, soft fills
  200: "#d9e0ea",  // card + table borders — visible on every monitor, not heavy
  300: "#b5bfcf",  // input borders
  400: "#76829a",  // muted text, icons (AA on white)
  500: "#596577",  // secondary text
  600: "#3e4a5e",  // body text on tinted fills
  700: "#273146",  // strong text
  800: colors.slate[800],
  900: colors.slate[900],
  950: colors.slate[950],
};

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "sans-serif"] },
      colors: {
        white: "#ffffff", // cards are pure white — the canvas tint and shadow do the separating
        slate,
        dark: { 900: "#020617", 800: "#0f172a", 700: "#1e293b", 600: "#334155" },
      },
    },
  },
  plugins: [],
};
