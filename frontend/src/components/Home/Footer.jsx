const Footer = () => (
  <footer id="contact" className="border-t border-slate-800/50 py-10 px-4 sm:px-6">
    <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
      <h1 className="text-xl font-black tracking-tight">Attend<span className="text-cyan-400">X</span></h1>
      <p className="text-slate-500 text-sm">&copy; {new Date().getFullYear()} AttendX. All rights reserved.</p>
    </div>
  </footer>
);
export default Footer;
