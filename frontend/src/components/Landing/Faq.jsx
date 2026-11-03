import { ChevronDown } from "lucide-react";
import { FAQS } from "../../content/landing.js";
import { Section } from "./ui.jsx";

/**
 * Native <details> accordions: the answers are in the DOM for crawlers and
 * keyboard users, and the visible text is byte-identical to the FAQPage
 * JSON-LD in index.html (tested).
 */
const Faq = () => (
  <Section
    id="faq"
    eyebrow="FAQ"
    title="Frequently asked questions about QR attendance"
    align="center"
    width="max-w-3xl"
  >
    <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
      {FAQS.map((f, i) => (
        <details key={f.q} className="group" open={i === 0}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-semibold text-slate-900 marker:content-none hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-white/5 [&::-webkit-details-marker]:hidden">
            <span>{f.q}</span>
            <ChevronDown size={18} className="shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{f.a}</p>
        </details>
      ))}
    </div>
  </Section>
);

export default Faq;
