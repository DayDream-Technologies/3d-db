import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { QueryModel } from "@/model/query";
import { generateSql } from "@/query/generateSql";
import { parseSqlToModel } from "@/query/parseSql";

type Props = {
  open: boolean;
  title: string;
  value: QueryModel;
  onClose: () => void;
  onSave: (q: QueryModel) => void;
  children?: React.ReactNode;
};

/**
 * Modal for editing a nested query (CTE body, subquery, UNION arm).
 * Default: raw SQL + parse; or pass `children` for a custom editor.
 */
export function NestedQueryDialog({
  open,
  title,
  value,
  onClose,
  onSave,
  children,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [text, setText] = useState(() => generateSql(value));

  useEffect(() => {
    if (open) setText(generateSql(value));
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nested-dlg-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg border border-slate-600 bg-slate-900 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-700 px-3 py-2">
          <h2 id="nested-dlg-title" className="text-sm font-semibold text-slate-100">
            {title}
          </h2>
          <button
            type="button"
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[calc(90vh-8rem)] overflow-y-auto p-3">
          {children ?? (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500">
                Edit SQL for this nested block, then apply. Best-effort parse; unsupported
                SQL can stay in the raw Query panel.
              </p>
              <textarea
                className="h-48 w-full rounded border border-slate-600 bg-slate-950 p-2 font-mono text-xs text-slate-200"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded bg-sky-600 px-3 py-1.5 text-xs text-white hover:bg-sky-500"
                  onClick={() => {
                    const r = parseSqlToModel(text);
                    if (r.ok) onSave(r.model);
                    else alert(r.reason);
                  }}
                >
                  Apply parsed SQL
                </button>
                <button
                  type="button"
                  className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                  onClick={() => onSave(value)}
                >
                  Use original
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
