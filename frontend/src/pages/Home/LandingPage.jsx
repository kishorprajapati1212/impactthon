import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import AppHelmet from "../../components/SEO/AppHelmet";
import SiteHeader from "../../components/Landing/SiteHeader.jsx";
import Hero from "../../components/Landing/Hero.jsx";
import ProxyCheck from "../../components/Landing/ProxyCheck.jsx";
import HowItWorks from "../../components/Landing/HowItWorks.jsx";
import Features from "../../components/Landing/Features.jsx";
import Roles from "../../components/Landing/Roles.jsx";
import Faq from "../../components/Landing/Faq.jsx";
import { StatsStrip, About, CtaBand, SiteFooter } from "../../components/Landing/Closing.jsx";
import { SITE_TITLE, SITE_DESCRIPTION } from "../../content/landing.js";

/**
 * Home page (v3.7 rebuild).
 *
 * Layout rules that keep anchor navigation correct:
 *  - the page root is NOT a scroll container (no overflow-hidden here), every
 *    decorative blob is clipped inside its own section, so "#features" scrolls
 *    the window and nothing is left dangling under the footer;
 *  - sections carry scroll-mt-24 for the sticky header;
 *  - the header is sticky, not fixed, so it never covers anchor targets.
 */
const LandingPage = () => {
  // /#faq style deep links: scroll after React has rendered the target
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return undefined;
    const id = window.requestAnimationFrame(() =>
      document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" }),
    );
    return () => window.cancelAnimationFrame(id);
  }, [hash]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <AppHelmet title={SITE_TITLE} description={SITE_DESCRIPTION} />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-cyan-500 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>

      <SiteHeader />

      <main id="main-content">
        <Hero />
        <StatsStrip />
        <ProxyCheck />
        <HowItWorks />
        <Features />
        <Roles />
        <About />
        <Faq />
        <CtaBand />
      </main>

      <SiteFooter />
    </div>
  );
};

export default LandingPage;
