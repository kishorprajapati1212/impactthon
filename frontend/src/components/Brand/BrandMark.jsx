import { BRAND } from "../../brand.js";

/**
 * The AttendX mark: a QR viewfinder square whose four strokes overshoot the
 * corners (crop-mark style) with a rounded scan-line through the centre.
 *
 * Geometry is a faithful vector of the Instagram profile picture - measured
 * frame side 90, stroke 11, corner overshoot 10, scan-line 47×9 (centred) -
 * normalised to a 96-unit viewBox: side 64, stroke 8, overshoot 7, line 34×7.
 *
 * tone
 *   "auto"   frame follows `currentColor` (slate-900 in light mode, white in
 *            dark mode); scan-line is brand blue on light, indigo on dark -
 *            exactly how the carousels (white) and reels (navy) behave.
 *   "tile"   navy rounded tile with white frame + indigo line = the app icon
 *            / Instagram avatar. Use where a square icon is expected.
 *   "onDark" white frame + indigo line, no tile (for dark hero backgrounds).
 */
const FRAME = [
  { x: 5, y: 12, width: 86, height: 8 }, // top
  { x: 5, y: 76, width: 86, height: 8 }, // bottom
  { x: 12, y: 5, width: 8, height: 86 }, // left
  { x: 76, y: 5, width: 8, height: 86 }, // right
];

const BrandMark = ({ size = 32, tone = "auto", className = "", title = `${BRAND.name} logo` }) => {
  const isTile = tone === "tile";
  const frameFill = tone === "auto" ? "currentColor" : "#ffffff";
  const lineClass = tone === "auto" ? "fill-brand-blue dark:fill-brand-indigo" : "";
  const lineFill = tone === "auto" ? undefined : BRAND.colors.indigo;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      role="img"
      aria-label={title}
      className={["shrink-0", className].filter(Boolean).join(" ")}
      data-tone={tone}
    >
      {isTile && <rect width="96" height="96" rx="22" fill={BRAND.colors.navy} />}
      <g transform={isTile ? "translate(15 15) scale(0.6875)" : undefined}>
        <g fill={frameFill}>
          {FRAME.map((r) => (
            <rect key={`${r.x}-${r.y}`} {...r} />
          ))}
        </g>
        <rect x="31" y="44.5" width="34" height="7" rx="3.5" className={lineClass} fill={lineFill} />
      </g>
    </svg>
  );
};

export default BrandMark;
