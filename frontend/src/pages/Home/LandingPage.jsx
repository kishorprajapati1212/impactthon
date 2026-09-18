import Header from "../../components/Home/Header";
import HeroSection from "../../components/Home/HeroSection";
import FeaturesSection from "../../components/Home/FeaturesSection";
import HowItWorksSection from "../../components/Home/HowItWorksSection";
import RolesSection from "../../components/Home/RolesSection";
import FAQSection from "../../components/Home/FAQSection";
import CTA from "../../components/Home/CTA";
import Footer from "../../components/Home/Footer";
import AppHelmet from "../../components/SEO/AppHelmet";

/**
 * SEO-friendly marketing homepage.
 * - Semantic landmark structure (header/nav/main/section/footer)
 * - Keyword-rich, human-readable copy in every section
 * - Structured FAQ + SoftwareApplication schema (see index.html)
 */
const LandingPage = () => (
  <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
    {/* Document-level SEO */}
    <AppHelmet
      title="AttendX — QR Code Attendance System for Colleges & Schools (2026)"
      description="AttendX is a smart QR code attendance system for colleges, universities and schools. Live rotating QR codes, GPS geofence verification, role-based dashboards and one-click Excel reports."
    />

    {/* Skip link for accessibility (also helps crawlers) */}
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-cyan-500 focus:text-white focus:rounded-lg"
    >
      Skip to main content
    </a>

    {/* Ambient background */}
    <div className="pointer-events-none absolute top-[-20%] left-[-10%] w-[640px] h-[640px] bg-blue-600/5 dark:bg-blue-600/10 blur-[140px] rounded-full" />
    <div className="pointer-events-none absolute bottom-[-20%] right-[-10%] w-[640px] h-[640px] bg-cyan-500/5 dark:bg-cyan-500/10 blur-[140px] rounded-full" />

    <Header />

    <main id="main-content">
      <HeroSection />

      {/* SEO-readable intro (visible, concise prose) */}
      <section
        aria-label="About AttendX attendance software"
        className="max-w-4xl mx-auto px-4 sm:px-6 pb-8"
      >
        <h2 className="sr-only">About AttendX college QR attendance system</h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed text-center">
          <strong className="text-slate-800 dark:text-slate-200">AttendX</strong>{" "}
          is a modern <strong>QR code attendance system</strong> built for{" "}
          <strong>colleges</strong>, <strong>universities</strong> and{" "}
          <strong>schools</strong>. Teachers start a live lecture with a
          rotating secure QR, students scan it with{" "}
          <strong>GPS geofence</strong> verification, and admins track every
          department with analytics and <strong>Excel attendance reports</strong>.
          No biometric scanners, no RFID cards, no extra hardware.
        </p>
      </section>

      <FeaturesSection />
      <HowItWorksSection />
      <RolesSection />
      <FAQSection />
      <CTA />
    </main>

    <Footer />
  </div>
);

export default LandingPage;
