import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X, AlertTriangle, Loader2, Inbox, MoreHorizontal } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────
   Admin UI kit — small, consistent primitives. Buttons are a REAL size
   (36 px tall, text + icon) so every action is readable and tappable.
   ───────────────────────────────────────────────────────────────────── */

const BTN = {
  base: "inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed",
  size: { md: "h-9 px-3.5 text-sm", sm: "h-8 px-3 text-[13px]", xs: "h-7 px-2.5 text-xs", icon: "h-9 w-9" },
  variant: {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800",
    danger: "border border-red-300 bg-white text-red-700 hover:bg-red-50 dark:bg-slate-900 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10",
    dangerSolid: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
  },
};

export function Button({ variant = "outline", size = "md", icon: Icon, children, className = "", loading = false, type = "button", ...rest }) {
  return (
    <button type={type} className={[BTN.base, BTN.size[size], BTN.variant[variant], className].join(" ")} disabled={loading || rest.disabled} {...rest}>
      {loading ? <Loader2 size={15} className="animate-spin" /> : Icon ? <Icon size={size === "xs" ? 13 : 15} className="shrink-0" /> : null}
      {children}
    </button>
  );
}

/**
 * MenuButton — "More ⋯" dropdown for secondary row actions. The menu is
 * portalled to <body> and positioned from the trigger's rect, so it is never
 * clipped by a scrolling table container.
 * items: [{ label, icon?, onClick, tone?: "danger", hint? }]
 */
export function MenuButton({ items = [], label = "More actions", size = "sm", className = "" }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btn = useRef(null);
  const menu = useRef(null);
  const place = () => {
    if (!btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const width = 256;
    const left = Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8));
    const below = r.bottom + 6;
    const estH = 44 * items.length + 12;
    const top = below + estH > window.innerHeight - 8 ? Math.max(8, r.top - estH - 6) : below;
    setPos({ top, left, width });
  };
  useLayoutEffect(() => { if (open) place(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (menu.current?.contains(e.target) || btn.current?.contains(e.target)) return; setOpen(false); };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onMove = () => setOpen(false);
    document.addEventListener("mousedown", close); document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onMove, true); window.addEventListener("resize", onMove);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", onKey); window.removeEventListener("scroll", onMove, true); window.removeEventListener("resize", onMove); };
  }, [open]);
  return (
    <>
      <button ref={btn} type="button" aria-haspopup="menu" aria-expanded={open} aria-label={label} title={label} onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className={[BTN.base, BTN.size[size], BTN.variant.outline, "px-2", className].join(" ")}>
        <MoreHorizontal size={16} />
      </button>
      {open && createPortal(
        <div ref={menu} role="menu" aria-label={label} style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
          className="z-[90] overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-xl animate-[notify-in_.12s_ease-out] dark:border-slate-700 dark:bg-slate-900">
          {items.filter(Boolean).map((it, i) => (
            <button key={i} type="button" role="menuitem" onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick?.(); }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 ${it.tone === "danger" ? "text-red-700 dark:text-red-400" : "text-slate-700 dark:text-slate-200"}`}>
              {it.icon && <it.icon size={15} className="shrink-0 opacity-80" />}
              <span className="min-w-0 flex-1"><span className="block truncate">{it.label}</span>{it.hint && <span className="block truncate text-xs font-normal text-slate-400">{it.hint}</span>}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

const PILL = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400",
  red: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-400",
};
export function Pill({ tone = "slate", children, dot = false, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${PILL[tone] || PILL.slate} ${className}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Panel({ title, description, actions, children, className = "", bodyClassName = "" }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            {title && <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">{title}</h3>}
            {description && <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function Avatar({ name = "", size = "md", tone = "blue" }) {
  const sz = size === "lg" ? "h-12 w-12 text-base" : size === "sm" ? "h-8 w-8 text-xs" : "h-9 w-9 text-[13px]";
  const tones = { blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300", violet: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300", slate: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200" };
  const ini = String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${sz} ${tones[tone] || tones.blue}`} aria-hidden="true">{ini}</span>;
}

export function Spinner({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500" role="status">
      <Loader2 size={18} className="animate-spin text-blue-600" /> {label}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title = "Nothing here yet", description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800"><Icon size={22} /></span>
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Right-hand slide-over used for forms and record details. */
export function Drawer({ open, onClose, title, subtitle, width = "max-w-xl", children, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  // Portal → document.body so parent layout utilities (space-y-*, overflow, transforms) never offset the overlay.
  return createPortal(
    <div className="fixed inset-0 z-[70] flex justify-end" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : "Panel"}>
      <button type="button" aria-label="Close panel" onClick={onClose} className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]" />
      <div className={`relative flex h-full w-full ${width} flex-col bg-white shadow-2xl dark:bg-slate-900 animate-[drawer-in_.22s_ease-out]`}>
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-[13px] text-slate-500">{subtitle}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X size={18} /></Button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/60">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", tone = "danger", loading = false, onConfirm, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-900/50" />
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="flex gap-4">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone === "danger" ? "bg-red-100 text-red-600 dark:bg-red-500/15" : "bg-blue-100 text-blue-600 dark:bg-blue-500/15"}`}><AlertTriangle size={20} /></span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
            {message && <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{message}</p>}
            {children}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={tone === "danger" ? "dangerSolid" : "primary"} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Label + control + help/error wrapper used by RecordForm. */
export function Field({ label, required, help, error, htmlFor, children, className = "" }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-slate-700 dark:text-slate-200">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : help ? <p className="mt-1 text-xs text-slate-500">{help}</p> : null}
    </div>
  );
}

export const inputCls = "block w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
export const selectCls = inputCls + " pr-8";
export const textareaCls = inputCls.replace("h-10", "min-h-[88px] py-2");

/** Definition list row used in detail drawers. */
export function KV({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="shrink-0 text-[13px] text-slate-500">{label}</dt>
      <dd className={`min-w-0 text-right text-sm font-medium text-slate-900 dark:text-slate-100 ${mono ? "font-mono text-[13px]" : ""}`}>{value === null || value === undefined || value === "" ? <span className="text-slate-400">—</span> : value}</dd>
    </div>
  );
}

export function Stat({ label, value, hint, tone = "slate" }) {
  const tones = { slate: "text-slate-900 dark:text-white", green: "text-emerald-600", amber: "text-amber-600", red: "text-red-600", blue: "text-blue-600" };
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold leading-tight ${tones[tone] || tones.slate}`}>{value}</p>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
