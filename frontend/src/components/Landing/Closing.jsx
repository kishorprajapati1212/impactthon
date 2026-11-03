import { Link } from "react-router-dom";
import { ArrowRight, Instagram } from "lucide-react";
import { STATS, NAV_LINKS } from "../../content/landing.js";
import BrandLogo from "../Brand/BrandLogo.jsx";
import { BRAND } from "../../brand.js";

/* global __APP_VERSION__ */
const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

/** Plain numbers strip under the hero, no icon tiles. */
export const StatsStrip = () => (
  <section aria-label="Key numbers" className="border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
    <dl className="max-w-7xl mx-auto grid grid-cols-2 divide-y divide-slate-200 px-4 sm:px-6 md:grid-cols-5 md:divide-x md:divide-y-0 dark:divide-slate-800">
      {STATS.map((s) => (
        <div key={s.label} className="flex flex-col px-2 py-6 text-center md:px-4">
          <dt className="order-2 mt-1 text-xs text-slate-500 dark:text-slate-400">{s.label}</dt>
          <dd className="order-1 text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">{s.value}</dd>
        </div>
      ))}
    </dl>
  </section>
);

/** Visible prose that carries the long-tail keywords (moved out of the title). */
export const About = () => (
  <section aria-labelledby="about-title" className="py-16 sm:py-20">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 grid gap-8 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-400">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" aria-hidden="true" /> About
        </p>
        <h2 id="about-title" className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">
          QR code attendance system for colleges &amp; schools
        </h2>
      </div>
      <p className="lg:col-span-8 text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-400">
        <strong className="text-slate-900 dark:text-slate-100">AttendX</strong> is a free{" "}
        <strong>QR code attendance system</strong> and <strong>student attendance management system</strong> built for{" "}
        <strong>colleges</strong>, <strong>universities</strong>, <strong>schools</strong> and coaching institutes in India
        and beyond. Teachers start a live lecture with a rotating secure QR, students scan it with{" "}
        <strong>GPS geofence</strong> verification that stops <strong>proxy attendance</strong>, mentors see every student
        they guide, and admins track every department with a plain attendance report and{" "}
        <strong>Excel attendance sheets</strong>. No biometric scanners, no RFID cards, no app install, no extra hardware.
      </p>
    </div>
  </section>
);

export const CtaBand = () => (
  <section aria-labelledby="cta-title" className="px-4 sm:px-6 pb-16 sm:pb-24">
    <div className="on-dark relative max-w-7xl mx-auto overflow-hidden rounded-3xl bg-slate-900 px-6 py-14 text-center text-white ring-1 ring-slate-800 sm:px-12 dark:bg-slate-900">
      <div className="lp-grid-dark pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-[90px]" aria-hidden="true" />
      <div className="relative">
        <h2 id="cta-title" className="text-3xl sm:text-4xl font-black tracking-tight text-balance">Ready to stop proxy attendance?</h2>
        <p className="mx-auto mt-4 max-w-xl text-slate-300">
          Log in with your college account and start a lecture. Accounts are created by your college admin,
          so ask them for your login details.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/login" className="btn-primary inline-flex items-center gap-2">
            Login <ArrowRight size={18} />
          </Link>
          <a href="#faq" className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-3 font-semibold text-white hover:bg-white/10 transition-colors">
            Read the FAQ
          </a>
        </div>
      </div>
    </div>
  </section>
);

export const SiteFooter = () => (
  <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 text-sm">
      <div className="lg:col-span-2">
        <BrandLogo size="md" tagline />
        <p className="mt-4 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          QR attendance for colleges, universities and schools, verified by GPS. No proxy attendance and no extra hardware.
        </p>
        {BRAND.social.instagram ? (
          <a href={BRAND.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="AttendX on Instagram"
             className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400">
            <Instagram size={16} /> Follow on Instagram
          </a>
        ) : null}
      </div>
      <nav aria-label="Footer">
        <p className="mb-3 font-semibold text-slate-900 dark:text-slate-100">Product</p>
        <ul className="space-y-2 text-slate-500 dark:text-slate-400">
          {NAV_LINKS.map((l) => (
            <li key={l.href}><a href={l.href} className="hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">{l.label}</a></li>
          ))}
        </ul>
      </nav>
      <div>
        <p className="mb-3 font-semibold text-slate-900 dark:text-slate-100">Get started</p>
        <ul className="space-y-2 text-slate-500 dark:text-slate-400">
          <li><Link to="/login" className="hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">Login</Link></li>
          <li className="text-xs leading-relaxed">Accounts are created by your college admin. Ask them for your login.</li>
        </ul>
      </div>
    </div>
    <div className="border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col gap-2 text-xs text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} {BRAND.name}. {BRAND.tagline}</p>
        <p>QR refreshes every 5 seconds · GPS verified · v{APP_VERSION}</p>
      </div>
    </div>
  </footer>
);
