import { Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { LogIn, User, Home } from "lucide-react";
import ThemeToggle from "./ThemeToggle.jsx";

/**
 * Shared top bar for Landing + Login (and any public page).
 * Always shows: logo | theme toggle | Sign In / Dashboard
 */
const AppNavbar = ({ transparent = false }) => {
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  const navigate = useNavigate();
  const location = useLocation();

  const dashboardPath = user?.role
    ? `/${String(user.role).toLowerCase()}`
    : "/login";

  return (
    <header
      className={[
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        transparent
          ? "bg-transparent py-5"
          : "glass-nav py-3 border-b border-slate-200 dark:border-slate-700/50",
      ].join(" ")}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">
            Attend<span className="text-cyan-400">X</span>
          </h1>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {location.pathname !== "/" && (
            <button
              type="button"
              onClick={() => navigate("/")}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Home"
            >
              <Home size={20} />
            </button>
          )}

          {/* Theme: light / dark */}
          <ThemeToggle />

          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => navigate(dashboardPath)}
              className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
            >
              <User size={16} />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
            >
              <LogIn size={16} />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppNavbar;
