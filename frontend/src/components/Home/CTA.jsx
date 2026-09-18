import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const CTA = () => {
  const navigate = useNavigate();

  return (
    <section id="contact" className="py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="card-2026 p-10 sm:p-14 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-600/10">
          <h2 className="text-3xl sm:text-4xl font-black mb-4 text-slate-900 dark:text-slate-50">
            Ready to make attendance automatic?
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg max-w-xl mx-auto">
            Set up your institution in minutes. No extra hardware, no paper
            registers — just scan, verify and report.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate("/login")}
              className="btn-primary inline-flex items-center gap-2 text-lg"
            >
              Get Started Now <ArrowRight size={20} />
            </button>
            <a href="#features" className="btn-secondary inline-flex items-center gap-2 text-lg">
              Explore features
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
