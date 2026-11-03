import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Menu, X, LogOut, Search, ChevronRight, GraduationCap, UserCog } from "lucide-react";
import BrandMark from "../components/Brand/BrandMark.jsx";
import { logout } from "../store/authSlice.js";
import api, { clearApiCache } from "../utils/api.js";
import ThemeToggle from "../components/UI/ThemeToggle.jsx";
import { NAV, findNav, SECTION_ALIASES, buildNavParams, filtersFromParams } from "./nav.js";
import { ENTITIES } from "./entities.jsx";
import { Avatar } from "./components/ui.jsx";
import ResourcePage from "./pages/ResourcePage.jsx";
import OverviewPage from "./pages/OverviewPage.jsx";
import ReportPage from "./pages/ReportPage.jsx";
import { LiveLecturesPage, LoginApprovalsPage } from "./pages/LivePages.jsx";
import LecturesPage from "./pages/LecturesPage.jsx";
import TeachingMapPage from "./pages/TeachingMapPage.jsx";

const pick = (r) => (r.status === "fulfilled" ? r.value?.data?.data || [] : []);
/* global __APP_VERSION__, __BUILD_TIME__ */
const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
const BUILD_TIME = typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "";
const buildLabel = () => { const d = BUILD_TIME ? new Date(BUILD_TIME) : null; return `v${APP_VERSION}${d && !Number.isNaN(d.getTime()) ? " · built " + d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) : ""}`; };

/**
 * AdminConsole - the admin application shell.
 *   • fixed dark sidebar (slide-over on mobile) with plain-language sections
 *   • top bar: breadcrumb, global people search, theme, account / log out
 *   • content: one page per ?section= (deep-linkable, back button works)
 */
export default function AdminConsole() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const rawSection = params.get("section") || "overview";
  const section = SECTION_ALIASES[rawSection] || rawSection;
  const nav = findNav(section);
  const entity = nav.entity ? ENTITIES[nav.entity] : null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");
  const [ctx, setCtx] = useState({ departments: [], sections: [], faculty: [], subjects: [] });

  // Lookup lists shared by every form / filter (departments, classes, faculty, subjects)
  const refreshCtx = useCallback(() => {
    clearApiCache();
    Promise.allSettled([
      api.get("/departments?showInactive=true"), api.get("/sections?showInactive=true"),
      api.get("/faculty?showInactive=true&limit=500"), api.get("/subjects?showInactive=true"),
    ]).then(([d, s, f, su]) => setCtx({ departments: pick(d), sections: pick(s), faculty: pick(f), subjects: pick(su) }));
  }, []);
  useEffect(() => { refreshCtx(); }, [refreshCtx]);

  // `extra` uses entity filter keys (e.g. { section: "none" } = class filter);
  // buildNavParams maps them to URL keys so they never collide with ?section=
  const go = useCallback((next, extra = {}) => {
    setParams(buildNavParams(next, extra));
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }, [setParams]);

  const autoCreate = params.get("new") === "1";
  const clearAutoCreate = useCallback(() => { const p = new URLSearchParams(params); p.delete("new"); setParams(p, { replace: true }); }, [params, setParams]);
  const initialSearch = params.get("q") || "";
  // Deep-link filters: ?section=students&mentor=none → the Mentor filter is pre-set
  // (only keys the page actually filters by; shell keys like ?section= are never filters)
  const initialFilters = useMemo(() => {
    if (entity?.filters) return filtersFromParams(params, entity.filters(ctx).map((f) => f.key));
    if (nav.filterKeys) return filtersFromParams(params, nav.filterKeys);
    return {};
  }, [entity, ctx, params, nav]);

  useEffect(() => { document.title = `${nav.title || nav.label} · AttendX Admin`; }, [nav]);
  useEffect(() => { console.info(`AttendX admin console ${buildLabel()}`); }, []);

  const handleLogout = () => { dispatch(logout()); navigate("/login"); };
  const submitSearch = (target) => { if (!q.trim()) return; go(target, { q: q.trim() }); setQ(""); };

  const page = useMemo(() => {
    if (entity) return <ResourcePage key={entity.key} entity={entity} ctx={ctx} refreshCtx={refreshCtx} autoCreate={autoCreate} onAutoCreateHandled={clearAutoCreate} initialSearch={initialSearch} initialFilters={initialFilters} />;
    switch (section) {
      case "live": return <LiveLecturesPage />;
      case "lectures": return <LecturesPage ctx={ctx} initialFilters={initialFilters} />;
      case "approvals": return <LoginApprovalsPage />;
      case "overview-matrix": return <TeachingMapPage go={go} />;
      case "attendance-report": return <ReportPage go={go} />;
      default: return <OverviewPage user={user} go={go} />;
    }
  }, [entity, ctx, refreshCtx, autoCreate, clearAutoCreate, initialSearch, initialFilters, section, user, go]);

  const Sidebar = (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5 dark:border-slate-800">
        <Link to="/" aria-label="AttendX home page" title="Go to the home page" className="flex min-w-0 items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
          <BrandMark tone="tile" size={36} className="rounded-lg shadow-sm" />
          <span className="min-w-0"><span className="block text-[15px] font-semibold leading-tight text-slate-900 dark:text-white">AttendX</span><span className="block text-[11px] uppercase tracking-wider text-slate-400">Admin console</span></span>
        </Link>
        <button type="button" onClick={() => setMenuOpen(false)} className="ml-auto rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white lg:hidden" aria-label="Close menu"><X size={18} /></button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin sections">
        {NAV.map((g) => (
          <div key={g.group} className="mb-5">
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{g.group}</p>
            <ul className="space-y-0.5">
              {g.items.map((it) => { const active = it.section === section; const Icon = it.icon; return (
                <li key={it.section}>
                  <button type="button" onClick={() => go(it.section)} aria-current={active ? "page" : undefined}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${active ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"}`}>
                    <Icon size={17} className={active ? "text-blue-600 dark:text-blue-300" : "text-slate-400"} /><span className="truncate">{it.label}</span>
                  </button>
                </li>); })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Avatar name={user?.name || "Admin"} tone="blue" />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-900 dark:text-white">{user?.name || "Administrator"}</p><p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email || "Admin account"}</p></div>
          <button type="button" onClick={handleLogout} className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white" title="Log out" aria-label="Log out"><LogOut size={17} /></button>
        </div>
        <p className="px-2 pt-1 text-[11px] text-slate-400" title={BUILD_TIME}>Console {buildLabel()}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{Sidebar}</aside>
      {/* Mobile sidebar */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="absolute inset-0 bg-slate-900/60" />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl">{Sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-6">
          <button type="button" onClick={() => setMenuOpen(true)} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden" aria-label="Open menu"><Menu size={20} /></button>
          <nav className="hidden min-w-0 items-center gap-1.5 text-[13px] text-slate-500 sm:flex" aria-label="Breadcrumb">
            <button type="button" onClick={() => go("overview")} className="hover:text-slate-900 dark:hover:text-white">Admin</button>
            <ChevronRight size={14} className="text-slate-300" />
            <span className="truncate font-medium text-slate-900 dark:text-white">{nav.title || nav.label}</span>
          </nav>

          {/* Global people search */}
          <div className="relative ml-auto w-full max-w-xs sm:max-w-sm">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitSearch("students"); if (e.key === "Escape") setQ(""); }}
              placeholder="Find a student or teacher…" aria-label="Find a student or teacher"
              className="h-9 w-full rounded-md border border-slate-300 bg-slate-50 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950" />
            {q.trim() && (
              <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => submitSearch("students")} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"><GraduationCap size={15} className="text-blue-600" /> Search students for “{q.trim()}”</button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => submitSearch("faculty")} className="flex w-full items-center gap-2.5 border-t border-slate-100 px-3 py-2.5 text-left text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"><UserCog size={15} className="text-violet-600" /> Search faculty for “{q.trim()}”</button>
              </div>
            )}
          </div>
          <ThemeToggle />
          <button type="button" onClick={handleLogout} className="hidden items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 md:inline-flex"><LogOut size={14} /> Log out</button>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1400px]">{page}</div>
        </main>
      </div>
    </div>
  );
}
