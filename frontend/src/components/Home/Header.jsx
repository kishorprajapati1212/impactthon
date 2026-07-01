import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, LogIn } from "lucide-react";
const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { const h = () => setScrolled(window.scrollY > 20); window.addEventListener("scroll", h); return () => window.removeEventListener("scroll", h); }, []);
  const links = [{label:"Features",href:"#features"},{label:"How It Works",href:"#how-it-works"},{label:"Contact",href:"#contact"}];
  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "glass-nav py-3" : "bg-transparent py-5"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2"><h1 className="text-2xl font-black tracking-tight">Attend<span className="text-cyan-400">X</span></h1></Link>
        <nav className="hidden md:flex items-center gap-8">
          {links.map(l => <a key={l.label} href={l.href} className="text-sm font-medium text-slate-300 hover:text-cyan-400 transition-colors">{l.label}</a>)}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <button onClick={() => navigate("/login")} className="btn-secondary text-sm py-2 px-4"><LogIn size={16} className="inline mr-1" /> Sign In</button>
        </div>
        <button className="md:hidden text-slate-300" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X size={24} /> : <Menu size={24} />}</button>
      </div>
      {mobileOpen && (
        <div className="md:hidden glass-nav border-t border-slate-700/50 p-4">
          {links.map(l => <a key={l.label} href={l.href} className="block py-2 text-slate-300 hover:text-cyan-400" onClick={() => setMobileOpen(false)}>{l.label}</a>)}
          <button onClick={() => { navigate("/login"); setMobileOpen(false); }} className="btn-primary w-full mt-3 text-sm">Sign In</button>
        </div>
      )}
    </header>
  );
};
export default Header;
