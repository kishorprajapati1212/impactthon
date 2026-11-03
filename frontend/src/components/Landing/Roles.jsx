import { Check } from "lucide-react";
import { ROLES } from "../../content/landing.js";
import { Section } from "./ui.jsx";

const Roles = () => (
  <Section
    id="roles"
    eyebrow="Roles"
    title="One attendance app for students, faculty and admins"
    lead="Same login page, three different workspaces. Each one shows only what that person needs to act on."
    className="bg-white dark:bg-slate-900/40 border-y border-slate-200 dark:border-slate-800"
  >
    <div className="grid gap-5 md:grid-cols-3">
      {ROLES.map((r) => (
        <article key={r.title} className="card-2026 flex flex-col p-6">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${r.chip}`}>
              <r.icon size={20} aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">{r.title}</h3>
              <p className={`text-xs font-semibold ${r.accent}`}>{r.tagline}</p>
            </div>
          </div>
          <ul className="mt-5 space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
            {r.points.map((p) => (
              <li key={p} className="flex items-start gap-2">
                <Check size={16} className="mt-0.5 shrink-0 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  </Section>
);

export default Roles;
