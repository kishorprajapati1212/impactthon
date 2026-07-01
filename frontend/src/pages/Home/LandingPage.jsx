import Header from "../../components/Home/Header";
import HeroSection from "../../components/Home/HeroSection";
import FeaturesSection from "../../components/Home/FeaturesSection";
import HowItWorksSection from "../../components/Home/HowItWorksSection";
import CTA from "../../components/Home/CTA";
import Footer from "../../components/Home/Footer";
const LandingPage = () => (
  <div className="relative min-h-screen bg-dark-900 text-slate-50 overflow-hidden">
    <div className="pointer-events-none absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full" />
    <div className="pointer-events-none absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-500/10 blur-[120px] rounded-full" />
    <Header /><HeroSection /><FeaturesSection /><HowItWorksSection /><CTA /><Footer />
  </div>
);
export default LandingPage;
