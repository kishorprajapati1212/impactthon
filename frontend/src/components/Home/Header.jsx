import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Menu, X, LogIn, User } from "lucide-react";
import ThemeToggle from "../UI/ThemeToggle.jsx";

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "FAQ", href: "#faq" },
  ];

  const dashboardPath = user?.role
    ? `/${String(user.role).toLowerCase()}`
    : "/login";

  return (
    <header
      className={[
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "surface-nav py-3"
          : "bg-transparent py-5",
      ].join(" ")}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" aria-label="AttendX home">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">
            Attend<span className="text-cyan-500">X</span>
          </h1>
        </Link>

        <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-cyan-500 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => navigate(dashboardPath)}
              className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
            >
              <User size={16} />
              Dashboard
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"
              >
                <LogIn size={16} />
                Login
              </button>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="btn-primary text-sm py-2 px-4"
              >
                Get Started
              </button>
            </>
          )}
        </div>

        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            className="text-slate-600 dark:text-slate-300 p-1"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden surface-nav border-t border-slate-200 dark:border-slate-800 p-4 space-y-3">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="block py-2 text-slate-600 dark:text-slate-300 hover:text-cyan-500"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          {!isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                navigate("/login");
                setMobileOpen(false);
              }}
              className="btn-primary w-full text-sm flex items-center justify-center gap-2"
            >
              <LogIn size={16} />
              Login / Get Started
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                navigate(dashboardPath);
                setMobileOpen(false);
              }}
              className="btn-primary w-full text-sm flex items-center justify-center gap-2"
            >
              <User size={16} />
              Dashboard
            </button>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
