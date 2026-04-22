import { useAppStore } from "@/state/store";
import { LearnLink } from "./LearnLink";

export function QueryPanel() {
  const schema = useAppStore((s) => s.schema);
  const queryText = useAppStore((s) => s.queryText);
  const setQueryText = useAppStore((s) => s.setQueryText);
  const runQueryHighlight = useAppStore((s) => s.runQueryHighlight);
  const clearQueryHighlight = useAppStore((s) => s.clearQueryHighlight);
  const qh = useAppStore((s) => s.queryHighlight);

  if (!schema) {
    return (
      <div className="p-3 text-sm text-slate-500">Import a schema first.</div>
    );
  }

  return (
    <div className="space-y-2 p-3 text-sm">
      <p className="text-xs leading-relaxed text-slate-500">
        Paste a <strong>SELECT</strong> query. Matching tables and join edges are
        highlighted in the scene (PostgreSQL-style SQL).
      </p>
      <textarea
        className="h-40 w-full resize-y rounded border border-slate-600 bg-slate-950 p-2 font-mono text-xs text-slate-200"
        placeholder={`SELECT o.*\nFROM orders o\nJOIN users u ON u.id = o.user_id`}
        value={queryText}
        onChange={(e) => setQueryText(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500"
          onClick={() => runQueryHighlight()}
        >
          Highlight in 3D
        </button>
        <button
          type="button"
          className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          onClick={() => {
            clearQueryHighlight();
            setQueryText("");
          }}
        >
          Clear
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
          <LearnLink topic="where" />
          <LearnLink topic="joins" />
          <LearnLink topic="innerJoin" />
          <LearnLink topic="leftJoin" />
          <LearnLink topic="groupBy" />
        </div>
      </div>
    </div>
  );
}
