import { PROXY_TRICKS } from "../../content/landing.js";
import { Section, StatusChip } from "./ui.jsx";

/**
 * The comparison every student (and HOD) is really asking about:
 * "which trick still works?" None. Desktop: table. Mobile: stacked cards.
 */
const ProxyCheck = () => (
  <Section
    id="proxy-check"
    eyebrow="Proxy check"
    title="Common proxy attendance tricks and how AttendX stops them"
    lead="A paper register trusts whoever holds the pen. AttendX checks a rotating code, the GPS location and a device-bound login, and keeps a record of all three."
  >
    {/* desktop table */}
    <div className="card-2026 hidden md:block overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
            <th scope="col" className="px-5 py-3 w-[26%]">The trick</th>
            <th scope="col" className="px-5 py-3 w-[24%]">Paper register</th>
            <th scope="col" className="px-5 py-3">AttendX</th>
            <th scope="col" className="px-5 py-3 w-[12%] text-right">Result</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {PROXY_TRICKS.map((row) => (
            <tr key={row.trick} className="align-top">
              <th scope="row" className="px-5 py-4 font-semibold text-slate-900 dark:text-slate-100">{row.trick}</th>
              <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{row.register}</td>
              <td className="px-5 py-4 text-slate-700 dark:text-slate-300">{row.attendx}</td>
              <td className="px-5 py-4 text-right"><StatusChip tone={row.tone}>{row.status}</StatusChip></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* mobile cards */}
    <ul className="grid gap-3 md:hidden">
      {PROXY_TRICKS.map((row) => (
        <li key={row.trick} className="card-2026 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold text-slate-900 dark:text-slate-100">{row.trick}</p>
            <StatusChip tone={row.tone} className="shrink-0">{row.status}</StatusChip>
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Paper register</dt>
              <dd className="text-slate-500 dark:text-slate-400">{row.register}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">AttendX</dt>
              <dd className="text-slate-700 dark:text-slate-300">{row.attendx}</dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  </Section>
);

export default ProxyCheck;
