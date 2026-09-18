import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "How does the QR attendance system work?",
    a: "A faculty member starts a live lecture and a QR code appears on screen, refreshing every 5 seconds so screenshots can't be reused. Students point their phone camera at the code; AttendX verifies the QR signature and the student's GPS location against the classroom geofence before marking them present.",
  },
  {
    q: "Can a student mark attendance from outside the classroom?",
    a: "No. Every scan is geofence-verified against the classroom coordinates and the student's live GPS. If they are outside the allowed area, the mark is rejected. The rotating QR also makes sharing a screenshot useless.",
  },
  {
    q: "Do I need any special hardware?",
    a: "No. You only need a screen or projector to show the QR and students' smartphones. There are no fingerprint scanners, RFID cards or biometric devices required.",
  },
  {
    q: "What if a student arrives late?",
    a: "Faculty can manually mark a late student as Present, Late or Excused from the live session or from the history view. Auto-finalization still marks everyone else correctly.",
  },
  {
    q: "Can teachers export attendance to Excel?",
    a: "Yes. Faculty generate a CSV/Excel sheet with roll numbers, names and a per-date P/A/L/E grid including totals and attendance percentage, filterable by date range.",
  },
  {
    q: "Is it free to try?",
    a: "AttendX is free to start. The demo includes seeded admin, faculty and student accounts so you can test the whole flow in minutes.",
  },
];

const FAQSection = () => {
  const [open, setOpen] = useState(0);

  return (
    <section
      id="faq"
      className="py-20 px-4 sm:px-6 bg-white dark:bg-slate-900/40 border-y border-slate-200 dark:border-slate-800"
    >
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-500 mb-2">
            FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl font-black mb-4 text-slate-900 dark:text-slate-50">
            Frequently asked questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="card-2026 overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                    {f.q}
                  </span>
                  <ChevronDown
                    size={18}
                    className={
                      "shrink-0 text-slate-400 transition-transform " +
                      (isOpen ? "rotate-180" : "")
                    }
                  />
                </button>
                {isOpen && (
                  <p className="px-5 pb-5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {f.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
