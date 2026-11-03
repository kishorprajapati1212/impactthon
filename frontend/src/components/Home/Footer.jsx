import { Link } from "react-router-dom";
import { Instagram } from "lucide-react";
import BrandLogo from "../Brand/BrandLogo.jsx";
import { BRAND } from "../../brand.js";

const Footer = () => (
  <footer className="py-12 px-4 border-t border-slate-200 dark:border-slate-800">
    <div className="max-w-7xl mx-auto grid sm:grid-cols-3 gap-8 text-sm">
      <div>
        <BrandLogo size="md" tagline className="mb-3" />
        <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
          Smart QR attendance for colleges, universities and schools —
          geofence-verified, proxy-proof and hardware-free.
        </p>
        {BRAND.social.instagram ? (
          <a
            href={BRAND.social.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="AttendX on Instagram"
            className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-cyan-500 dark:text-slate-400 transition-colors"
          >
            <Instagram size={16} /> Follow on Instagram
          </a>
        ) : null}
      </div>
      <div>
        <p className="font-semibold mb-3 text-slate-700 dark:text-slate-200">
          Product
        </p>
        <ul className="space-y-2 text-slate-500 dark:text-slate-400">
          <li>
            <a href="#features" className="hover:text-cyan-500 transition-colors">
              Features
            </a>
          </li>
          <li>
            <a href="#how-it-works" className="hover:text-cyan-500 transition-colors">
              How it works
            </a>
          </li>
          <li>
            <a href="#faq" className="hover:text-cyan-500 transition-colors">
              FAQ
            </a>
          </li>
        </ul>
      </div>
      <div>
        <p className="font-semibold mb-3 text-slate-700 dark:text-slate-200">
          Get started
        </p>
        <ul className="space-y-2 text-slate-500 dark:text-slate-400">
          <li>
            <Link to="/login" className="hover:text-cyan-500 transition-colors">
              Login
            </Link>
          </li>
          <li className="text-xs leading-relaxed">
            Accounts are created by your college admin — ask them for your login.
          </li>
        </ul>
      </div>
    </div>
    <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
      <p>
        &copy; {new Date().getFullYear()} AttendX. All rights reserved. · QR
        codes refresh every 5 seconds · geofence-verified attendance
      </p>
    </div>
  </footer>
);

export default Footer;
