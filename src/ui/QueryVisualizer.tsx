import { useAppStore } from "@/state/store";
import { LearnLink } from "./LearnLink";
import { Sparkles } from "lucide-react";

/**
 * Run query highlight against the current `queryText` and show which tables / joins
 * the 3D scene will emphasize. SQL is edited in Builder or Raw SQL.
 */
export function QueryVisualizer() {
  const queryText = useAppStore((s) => s.queryText);
  const runQueryHighlight = useAppStore((s) => s.runQueryHighlight);
  const clearQueryHighlight = useAppStore((s) => s.clearQueryHighlight);
  const qh = useAppStore((s) => s.queryHighlight);

  const hasSql = queryText.trim().length > 0;
  const preview = queryText.trim() || "— (no query yet)";

  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs leading-relaxed text-slate-500">
        The canvas highlights tables and join paths for the current query. Use{" "}
        <strong>Builder</strong> or <strong>Raw SQL</strong> to change the query,
        then run the visualizer here.
      </p>
      <div>
        <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
          Current query
        </div>
        <pre className="max-h-32 overflow-auto rounded border border-slate-700 bg-slate-950/80 p-2 font-mono text-[10px] text-slate-300">
          {preview}
        </pre>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!hasSql}
          onClick={() => runQueryHighlight()}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Highlight in 3D
        </button>
        <button
          type="button"
          className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          onClick={() => clearQueryHighlight()}
        >
          Clear highlight
        </button>
      </div>
      {qh && (
        <div
          className={`rounded border p-2 text-xs ${
            qh.ok
              ? "border-emerald-800/80 bg-emerald-950/40 text-emerald-200"
              : "border-red-900/60 bg-red-950/30 text-red-200"
          }`}
        >
          {qh.ok ? (
            <>
              <div>
                Tables:{" "}
                {qh.tables.length
                  ? qh.tables.map((t) => (
                      <code key={t} className="mr-1 text-emerald-100">
                        {t}
                      </code>
                    ))
                  : "none detected"}
              </div>
              {qh.joins.length > 0 && (
                <div className="mt-1 text-emerald-300/90">
                  Joins:{" "}
                  {qh.joins.map((j) => (
                    <span key={`${j.left}-${j.right}`} className="mr-2">
                      {j.left} ↔ {j.right}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <span>{qh.error ?? "Parse error"}</span>
          )}
        </div>
      )}
      <div className="rounded border border-slate-700 bg-slate-900/60 p-2 text-[11px] text-slate-400">
        <div className="mb-1 font-semibold text-slate-300">
          Learn the query syntax
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <LearnLink topic="select" />
          <LearnLink topic="joins" />
          <LearnLink topic="innerJoin" />
        </div>
      </div>
    </div>
  );
}
