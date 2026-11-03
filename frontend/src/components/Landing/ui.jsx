/**
 * Small building blocks shared by the landing sections.
 * Palette = the app's own design system (slate canvas, white cards, cyan
 * accent, full dark mode) so the home page feels like the product behind it.
 */

/** Consistent section shell: anchor id with scroll offset, eyebrow, h2, lead. */
export const Section = ({ id, eyebrow, title, lead, children, className = "", align = "left", width = "max-w-7xl" }) => (
  <section id={id} className={`py-16 sm:py-24 ${className}`}>
    <div className={`${width} mx-auto px-4 sm:px-6`}>
      {(eyebrow || title || lead) && (
        <div className={`mb-10 sm:mb-14 ${align === "center" ? "text-center max-w-3xl mx-auto" : "max-w-3xl"}`}>
          {eyebrow && (
            <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-400">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" aria-hidden="true" />
              {eyebrow}
            </p>
          )}
          {title && (
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-slate-50 text-balance">
              {title}
            </h2>
          )}
          {lead && <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">{lead}</p>}
        </div>
      )}
      {children}
    </div>
  </section>
);

/**
 * Viewfinder corners: the brand mark's motif, used to frame "scanned" things.
 * Pure CSS, inherits text colour.
 */
export const Corners = ({ className = "", inset = "inset-2", size = "h-4 w-4", stroke = "border-2" }) => (
  <span aria-hidden="true" className={`pointer-events-none absolute ${inset} ${className}`}>
    <span className={`absolute left-0 top-0 ${size} ${stroke} border-r-0 border-b-0 border-current rounded-tl-sm`} />
    <span className={`absolute right-0 top-0 ${size} ${stroke} border-l-0 border-b-0 border-current rounded-tr-sm`} />
    <span className={`absolute left-0 bottom-0 ${size} ${stroke} border-r-0 border-t-0 border-current rounded-bl-sm`} />
    <span className={`absolute right-0 bottom-0 ${size} ${stroke} border-l-0 border-t-0 border-current rounded-br-sm`} />
  </span>
);

const TONES = {
  success: "badge badge-success",
  danger: "badge badge-danger",
  warning: "badge badge-warning",
  info: "badge badge-info",
  neutral: "badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export const StatusChip = ({ tone = "neutral", children, className = "" }) => (
  <span className={`${TONES[tone] || TONES.neutral} ${className}`}>{children}</span>
);

/** A deterministic fake QR pattern (so only ONE real QR is rendered on the page). */
export const FakeQr = ({ seed = 7, cells = 9, className = "" }) => {
  const bits = [];
  let x = seed * 2654435761 % 4294967296;
  for (let i = 0; i < cells * cells; i += 1) {
    x = (x * 1103515245 + 12345) % 2147483648;
    bits.push(x % 3 !== 0);
  }
  // three 3×3 finder squares (dark ring, light centre) like a real QR
  const finderCell = (r, c) => {
    const inTL = r < 3 && c < 3;
    const inTR = r < 3 && c >= cells - 3;
    const inBL = r >= cells - 3 && c < 3;
    if (!(inTL || inTR || inBL)) return null;
    const lr = r % 3 === 1 || (inBL && r === cells - 2);
    const lc = c % 3 === 1 || (inTR && c === cells - 2);
    return !(lr && lc);
  };
  return (
    <span
      aria-hidden="true"
      className={`grid gap-[1px] ${className}`}
      style={{ gridTemplateColumns: `repeat(${cells}, minmax(0, 1fr))` }}
    >
      {bits.map((on, i) => {
        const r = Math.floor(i / cells);
        const c = i % cells;
        const f = finderCell(r, c);
        const dark = f === null ? on : f;
        return <span key={i} className={dark ? "bg-current" : "bg-transparent"} style={{ aspectRatio: "1 / 1" }} />;
      })}
    </span>
  );
};
