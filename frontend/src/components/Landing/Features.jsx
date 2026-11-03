import { FEATURES } from "../../content/landing.js";
import { Section, FakeQr } from "./ui.jsx";

const QrStrip = () => (
  <div className="mt-6 flex items-end gap-3" aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <div key={i} className={`relative rounded-lg bg-white p-2 ring-1 ring-slate-200 dark:ring-slate-700 ${i < 2 ? "opacity-40 grayscale" : ""}`}>
        <FakeQr seed={21 + i} cells={9} className="h-12 w-12 text-slate-900" />
        {i < 2 && <span className="absolute inset-x-0 top-1/2 h-px bg-rose-500/80" />}
        <span className={`absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 text-[9px] font-bold ${i < 2 ? "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300" : "bg-emerald-500 text-white"}`}>
          {i < 2 ? "expired" : "live"}
        </span>
      </div>
    ))}
    <p className="ml-1 text-xs text-slate-500 dark:text-slate-400">10 s ago · 5 s ago · now</p>
  </div>
);

const Fence = () => (
  <div className="relative mt-6 h-24" aria-hidden="true">
    <span className="absolute left-6 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full border border-dashed border-cyan-500/60" />
    <span className="absolute left-12 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-cyan-500/15 ring-1 ring-cyan-500/50" />
    <span className="absolute left-[3.75rem] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-cyan-500" />
    <span className="absolute left-36 top-3 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">canteen · blocked</span>
    <span className="absolute left-36 top-10 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">hostel · blocked</span>
    <span className="absolute left-36 top-[4.25rem] rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">bench · present</span>
  </div>
);

const Features = () => (
  <Section
    id="features"
    eyebrow="Features"
    title="Everything a student attendance management system needs"
    lead="Built for a real lecture: one projector, forty phones and very little time."
  >
    <div className="grid gap-4 md:grid-cols-6">
      {FEATURES.map((f) => {
        const large = f.size === "large";
        return (
          <article
            key={f.title}
            className={`card-2026 card-hover relative flex flex-col p-6 ${large ? "md:col-span-3" : "md:col-span-2"}`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100 dark:bg-cyan-500/10 dark:text-cyan-400 dark:ring-cyan-500/20">
                <f.icon size={20} aria-hidden="true" />
              </span>
              <h3 className={`font-bold text-slate-900 dark:text-slate-50 ${large ? "text-lg" : "text-base"}`}>{f.title}</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{f.text}</p>
            {large && (f.title.startsWith("Rotating") ? <QrStrip /> : <Fence />)}
          </article>
        );
      })}
    </div>
  </Section>
);

export default Features;
