import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Spinner, EmptyState } from "./ui.jsx";

/**
 * DataTable - desktop table (≥ lg) + stacked cards (< lg) from ONE column
 * config, so both views always show the same information.
 *
 * columns: [{ key, label, render(item), sortField?, className?, hideOn?: "md"|"lg", primary?: bool }]
 * renderActions(item) → a <div> of real buttons (Edit / Deactivate / Delete…)
 */
export default function DataTable({ columns, items, loading, emptyTitle, emptyDescription, emptyAction, rowKey = (i) => i._id, onRowClick, renderActions, sort, onSort, rowClassName, footer }) {
  if (loading) return <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><Spinner /></div>;
  if (!items?.length) return <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} /></div>;

  const hide = { md: "hidden md:table-cell", lg: "hidden xl:table-cell" };
  const SortIcon = ({ field }) => {
    if (!field || !onSort) return null;
    if (sort?.field !== field) return <ArrowUpDown size={12} className="text-slate-300" />;
    return sort.order === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Desktop */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-800">
              {columns.map((c) => (
                <th key={c.key} scope="col" className={`whitespace-nowrap px-3.5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${hide[c.hideOn] || ""} ${c.className || ""}`}>
                  {c.sortField && onSort ? (
                    <button type="button" onClick={() => onSort(c.sortField)} className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-slate-800 dark:hover:text-slate-200" aria-label={`Sort by ${c.label}`}>{c.label} <SortIcon field={c.sortField} /></button>
                  ) : c.label}
                </th>
              ))}
              {renderActions && <th scope="col" className="sticky right-0 z-10 w-px whitespace-nowrap bg-slate-50 px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 shadow-[inset_1px_0_0_0_rgb(226_232_240)] dark:bg-slate-800 dark:shadow-[inset_1px_0_0_0_rgb(30_41_59)]">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => (
              <tr key={rowKey(item)} onClick={onRowClick ? () => onRowClick(item) : undefined} className={`group ${onRowClick ? "cursor-pointer" : ""} transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 ${rowClassName?.(item) || ""}`}>
                {columns.map((c) => (
                  <td key={c.key} className={`px-3.5 py-3 align-middle text-slate-700 dark:text-slate-200 ${hide[c.hideOn] || ""} ${c.className || ""}`}>{c.render(item)}</td>
                ))}
                {renderActions && (
                  <td className="sticky right-0 z-10 w-px whitespace-nowrap bg-white px-4 py-2.5 align-middle shadow-[inset_1px_0_0_0_rgb(241_245_249)] transition-colors group-hover:bg-slate-50 dark:bg-slate-900 dark:shadow-[inset_1px_0_0_0_rgb(30_41_59)] dark:group-hover:bg-slate-800" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">{renderActions(item)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile / tablet cards */}
      <ul className="divide-y divide-slate-100 lg:hidden dark:divide-slate-800">
        {items.map((item) => {
          const primary = columns.find((c) => c.primary) || columns[0];
          const rest = columns.filter((c) => c !== primary);
          return (
            <li key={rowKey(item)} className="p-4">
              <div onClick={onRowClick ? () => onRowClick(item) : undefined} className={onRowClick ? "cursor-pointer" : ""}>
                <div className="text-sm text-slate-900 dark:text-slate-100">{primary.render(item)}</div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                  {rest.map((c) => (
                    <div key={c.key} className="min-w-0">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{c.label}</dt>
                      <dd className="text-[13px] text-slate-700 dark:text-slate-200 [&_*]:whitespace-normal">{c.render(item)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              {renderActions && <div className="mt-3 flex flex-wrap gap-2">{renderActions(item)}</div>}
            </li>
          );
        })}
      </ul>

      {footer && <div className="border-t border-slate-200 px-4 py-2.5 dark:border-slate-800">{footer}</div>}
    </div>
  );
}
