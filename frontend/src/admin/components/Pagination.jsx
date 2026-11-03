import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, selectCls } from "./ui.jsx";

export default function Pagination({ page, pages, total, limit, onPage, onLimit }) {
  if (!total) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-slate-600 dark:text-slate-300">
      <p className="whitespace-nowrap">Showing <b className="font-semibold text-slate-900 dark:text-white">{from}-{to}</b> of <b className="font-semibold text-slate-900 dark:text-white">{total}</b></p>
      <div className="flex items-center gap-2">
        {onLimit && (
          <select value={limit} onChange={(e) => onLimit(Number(e.target.value))} className={selectCls + " h-8 w-auto text-xs"} aria-label="Rows per page">
            {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
        )}
        <Button size="sm" variant="outline" icon={ChevronLeft} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">Prev</Button>
        <span className="whitespace-nowrap px-1 tabular-nums">Page {page} of {pages || 1}</span>
        <Button size="sm" variant="outline" disabled={page >= (pages || 1)} onClick={() => onPage(page + 1)} aria-label="Next page">Next <ChevronRight size={14} /></Button>
      </div>
    </div>
  );
}
