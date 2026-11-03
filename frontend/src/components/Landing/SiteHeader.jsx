import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Menu, X, LogIn, LayoutDashboard } from "lucide-react";
import ThemeToggle from "../UI/ThemeToggle.jsx";
import BrandLogo from "../Brand/BrandLogo.jsx";
import { NAV_LINKS } from "../../content/landing.js";

/**
 * Landing header. Sticky (not fixed) so it never overlaps anchor targets, and
 * the logo always brings you "home": on another page it navigates to "/", on
 * the home page it scrolls to the top.
 */
const SiteHeader = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mobile menu: Escape closes, body scroll locked while open
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  const dashboardPath = user?.role ? `/${String(user.role).toLowerCase()}` : "/login";

  const onLogoClick = (e) => {
    if (pathname === "/") {
      e.preventDefault();
      setOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (window.location.hash) window.history.replaceState(null, "", "/");
    }
  };

  const Actions = ({ mobile = false }) =>
    isAuthenticated ? (
      <button
        type="button"
        onClick={() => { navigate(dashboardPath); setOpen(false); }}
        className={`btn-primary text-sm py-2.5 px-4 flex items-center justify-center gap-2 ${mobile ? "w-full" : ""}`}
      >
        <LayoutDashboard size={16} />
        Open my dashboard
      </button>
    ) : (
      <>
        <button
          type="button"
          onClick={() => { navigate("/login"); setOpen(false); }}
          className={`btn-secondary text-sm py-2.5 px-4 flex items-center justify-center gap-2 ${mobile ? "w-full" : ""}`}
        >
          <LogIn size={16} />
          Login
        </button>
        <button
          type="button"
          onClick={() => { navigate("/login"); setOpen(false); }}
          className={`btn-primary text-sm py-2.5 px-4 ${mobile ? "w-full" : ""}`}
        >
          Get Started
        </button>
      </>
    );

  return (
    <header
      className={[
        "sticky top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300",
        open || scrolled
          ? "surface-nav !bg-white/90 dark:!bg-slate-950/90 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
          : "border-b border-transparent bg-slate-50/0 dark:bg-slate-950/0",
      ].join(" ")}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-[4.5rem] flex items-center justify-between gap-4">
        <Link to="/" onClick={onLogoClick} className="flex items-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500" aria-label="AttendX home">
          <BrandLogo size="md" />
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          <Actions />
        </div>

        <div className="flex md:hidden items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            className="p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="md:hidden fixed inset-0 top-16 bg-slate-900/40 cursor-default"
          />
          <div
            id="mobile-menu"
            className="md:hidden relative z-10 border-t border-slate-200 bg-white px-4 py-4 shadow-xl dark:border-slate-800 dark:bg-slate-950"
          >
            <nav aria-label="Primary mobile" className="grid gap-1">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="mt-4 grid gap-2">
              <Actions mobile />
            </div>
          </div>
        </>
      )}
    </header>
  );
};

export default SiteHeader;
