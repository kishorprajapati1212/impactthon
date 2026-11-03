import BrandMark from "./BrandMark.jsx";
import { BRAND } from "../../brand.js";

/**
 * Logo lock-up: mark + "AttendX" wordmark (+ optional tagline).
 *
 *  - horizontal (default): mark left, wordmark right - navbars, footer.
 *  - stacked: mark above wordmark above tagline - login card, empty states;
 *    this is the same arrangement as the Instagram profile picture.
 *
 * The wordmark keeps the site's own font (Inter, font-black) so it renders
 * identically to the text-only logo the site had before; only the "X" takes
 * the brand accent (blue on light surfaces, indigo on dark - as on Instagram).
 */
const SIZES = {
  sm: { mark: 24, word: "text-lg", gap: "gap-2", tag: "text-[10px] tracking-[0.18em]" },
  md: { mark: 30, word: "text-2xl", gap: "gap-2.5", tag: "text-[11px] tracking-[0.18em]" },
  lg: { mark: 56, word: "text-4xl", gap: "gap-3", tag: "text-xs tracking-[0.22em]" },
  xl: { mark: 72, word: "text-5xl", gap: "gap-4", tag: "text-sm tracking-[0.24em]" },
};

const BrandLogo = ({
  size = "md",
  stacked = false,
  tagline = false,
  as: Tag = "span",
  className = "",
  markTone = "auto",
}) => {
  const s = SIZES[size] || SIZES.md;

  const wordmark = (
    <Tag className={`${s.word} font-black tracking-tight leading-none text-slate-900 dark:text-slate-50`}>
      Attend
      <span className="text-brand-blue dark:text-brand-indigo">X</span>
    </Tag>
  );

  const tag = tagline ? (
    <span
      className={`${s.tag} block font-semibold uppercase text-slate-500 dark:text-slate-400 ${stacked ? "mt-2" : "mt-1"}`}
    >
      {BRAND.tagline}
    </span>
  ) : null;

  if (stacked) {
    return (
      <div className={["flex flex-col items-center text-center", className].filter(Boolean).join(" ")}>
        <BrandMark size={s.mark} tone={markTone} className="mb-3 text-slate-900 dark:text-slate-50" />
        {wordmark}
        {tag}
      </div>
    );
  }

  return (
    <span className={["inline-flex items-center", s.gap, className].filter(Boolean).join(" ")}>
      <BrandMark size={s.mark} tone={markTone} className="text-slate-900 dark:text-slate-50" />
      <span className="flex flex-col">
        {wordmark}
        {tag}
      </span>
    </span>
  );
};

export default BrandLogo;
