import { useState } from "react";
import { Search, RefreshCw, X, SlidersHorizontal } from "lucide-react";
import { Button, selectCls } from "./ui.jsx";

/**
 * FilterBar - row 1: search + show-inactive + refresh; row 2: select filters.
 * On phones the select filters collapse behind a "Filters" button.
 * filters: [{ key, label, options: [{value,label}], value, onChange }]
 */
export default function FilterBar({ search, onSearch, searchPlaceholder = "Search…", filters = [], showInactive, onShowInactive, onRefresh, refreshing, resultText, onClear }) {
  const [openOnMobile, setOpenOnMobile] = useState(false);
  const activeFilters = filters.filter((f) => f.value).length;
  const hasFilters = (search && search.length) || activeFilters > 0 || showInactive;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xl">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder}
            className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
          {search && <button type="button" onClick={() => onSearch("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"><X size={14} /></button>}
        </div>
        {filters.length > 0 && (
          <Button variant="outline" icon={SlidersHorizontal} className="lg:hidden" onClick={() => setOpenOnMobile((o) => !o)} aria-expanded={openOnMobile}>
            Filters{activeFilters ? ` (${activeFilters})` : ""}
          </Button>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {onShowInactive && (
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
              <input type="checkbox" checked={!!showInactive} onChange={(e) => onShowInactive(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-blue-600" />
              Show inactive
            </label>
          )}
          {hasFilters && onClear && <Button variant="ghost" onClick={onClear} icon={X}>Clear</Button>}
          {onRefresh && <Button variant="outline" onClick={onRefresh} icon={RefreshCw} className={refreshing ? "[&_svg]:animate-spin" : ""} aria-label="Refresh">Refresh</Button>}
        </div>
      </div>

      {filters.length > 0 && (
        <div className={`${openOnMobile ? "flex" : "hidden"} mt-2 flex-wrap items-center gap-2 border-t border-slate-100 pt-2 dark:border-slate-800 lg:flex`}>
          <span className="hidden items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400 lg:inline-flex"><SlidersHorizontal size={13} /> Filter</span>
          {filters.map((f) => (
            <select key={f.key} value={f.value || ""} onChange={(e) => f.onChange(e.target.value)} aria-label={f.label}
              className={selectCls + ` h-9 w-full sm:w-auto sm:min-w-[160px] sm:max-w-[260px] ${f.value ? "border-blue-400 bg-blue-50/60 text-blue-900 dark:border-blue-500/60 dark:bg-blue-500/10 dark:text-blue-100" : ""}`}>
              <option value="">{f.label}: all</option>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ))}
        </div>
      )}
      {resultText && <p className="mt-2 px-0.5 text-xs text-slate-500">{resultText}</p>}
    </div>
  );
}
