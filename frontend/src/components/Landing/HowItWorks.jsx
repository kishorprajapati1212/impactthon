import { STEPS } from "../../content/landing.js";
import { Section, Corners, FakeQr } from "./ui.jsx";

/** Small CSS illustrations: no images to load, crisp in both themes. */
const Vignette = ({ kind }) => {
  if (kind === "projector") {
    return (
      <div className="relative mx-auto h-28 w-40 rounded-lg bg-slate-900 p-3 ring-1 ring-slate-700 dark:bg-slate-950">
        <div className="flex h-full items-center justify-between gap-3">
          <div className="text-[9px] leading-tight text-slate-300">
            <p className="font-bold text-white">DS · CE-3A</p>
            <p>Room 304</p>
            <p className="mt-2 inline-flex items-center gap-1 text-emerald-400"><span className="h-1 w-1 rounded-full bg-emerald-400" />live</p>
          </div>
          <div className="rounded bg-white p-1.5 text-slate-900"><FakeQr seed={3} cells={9} className="h-14 w-14" /></div>
        </div>
        <span className="absolute -bottom-2 left-1/2 h-2 w-24 -translate-x-1/2 rounded-b bg-slate-700" aria-hidden="true" />
      </div>
    );
  }
  if (kind === "phone") {
    return (
      <div className="relative mx-auto h-28 w-20 rounded-[14px] border-[3px] border-slate-800 bg-slate-900 p-1.5 dark:border-slate-600">
        <div className="relative flex h-full items-center justify-center rounded-[9px] bg-slate-800 text-cyan-400">
          <Corners inset="inset-2.5" size="h-3 w-3" />
          <div className="rounded bg-white p-1 text-slate-900"><FakeQr seed={11} cells={9} className="h-9 w-9" /></div>
          <span className="absolute inset-x-3 top-1/2 h-px bg-cyan-400/80 shadow-[0_0_8px_rgba(34,211,238,0.9)] motion-safe:animate-pulse" aria-hidden="true" />
        </div>
      </div>
    );
  }
  if (kind === "geofence") {
    return (
      <div className="relative mx-auto flex h-28 w-40 items-center justify-center">
        <span className="absolute h-24 w-24 rounded-full border border-dashed border-cyan-500/50" aria-hidden="true" />
        <span className="absolute h-14 w-14 rounded-full bg-cyan-500/10 ring-1 ring-cyan-500/40" aria-hidden="true" />
        <span className="relative z-10 h-3 w-3 rounded-full bg-cyan-500 ring-4 ring-white dark:ring-slate-900" aria-hidden="true" />
        <span className="absolute right-2 top-3 flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> hostel
        </span>
        <span className="absolute bottom-3 left-3 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
          inside 100 m
        </span>
      </div>
    );
  }
  // sheet
  const rows = [["Nihal", "P", "P", "L"], ["Jeel", "P", "A", "P"], ["Ritik", "A", "P", "P"]];
  const tone = { P: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400", A: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400", L: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" };
  return (
    <div className="mx-auto w-44 overflow-hidden rounded-lg border border-slate-200 bg-white text-[10px] dark:border-slate-700 dark:bg-slate-950">
      <div className="grid grid-cols-[1fr,repeat(3,20px)] gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1 font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        <span>Name</span><span>1</span><span>2</span><span>3</span>
      </div>
      {rows.map((r) => (
        <div key={r[0]} className="grid grid-cols-[1fr,repeat(3,20px)] items-center gap-1 px-2 py-1 text-slate-700 dark:text-slate-300">
          <span className="font-medium">{r[0]}</span>
          {r.slice(1).map((c, i) => <span key={i} className={`flex h-4 w-4 items-center justify-center rounded font-bold ${tone[c]}`}>{c}</span>)}
        </div>
      ))}
    </div>
  );
};

const HowItWorks = () => (
  <Section
    id="how-it-works"
    eyebrow="How it works"
    title="How the QR + GPS attendance system works in a lecture"
    lead="Four steps, about thirty seconds for a whole class, and nothing to install."
    className="bg-white dark:bg-slate-900/40 border-y border-slate-200 dark:border-slate-800"
  >
    <ol className="relative grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      <span className="pointer-events-none absolute left-0 right-0 top-[8.5rem] hidden h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-slate-700 xl:block" aria-hidden="true" />
      {STEPS.map((s, i) => (
        <li key={s.title} className="card-2026 relative flex flex-col p-6">
          <div className="mb-5 flex h-28 items-center justify-center text-slate-700 dark:text-slate-200">
            <Vignette kind={s.vignette} />
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white dark:bg-cyan-500 dark:text-slate-950">{i + 1}</span>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">{s.title}</h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{s.text}</p>
        </li>
      ))}
    </ol>
  </Section>
);

export default HowItWorks;
