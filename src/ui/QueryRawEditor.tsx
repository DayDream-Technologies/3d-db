import { useAppStore } from "@/state/store";
import { parseSqlToModel } from "@/query/parseSql";
import { LearnLink } from "./LearnLink";
import { useState } from "react";

type Props = {
  onAfterParseToBuilder?: () => void;
};

/**
 * Free-text SQL editor; shared with the query highlighter. Optionally syncs to
 * the visual builder when raw SQL round-trips through parseSqlToModel.
 */
export function QueryRawEditor({ onAfterParseToBuilder }: Props) {
  const queryText = useAppStore((s) => s.queryText);
  const setQueryText = useAppStore((s) => s.setQueryText);
  const setBuilderModel = useAppStore((s) => s.setBuilderModel);
  const [parseMsg, setParseMsg] = useState<string | null>(null);

  return (
    <div className="space-y-2 text-sm">
      <p className="text-xs leading-relaxed text-slate-500">
        Paste a <strong>SELECT</strong> query (PostgreSQL-style). Open the{" "}
        <strong>Visualizer</strong> tab to run <strong>Highlight in 3D</strong>{" "}
        and see which tables and joins are used.
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
          className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          onClick={() => {
            setParseMsg(null);
            setQueryText("");
          }}
        >
          Clear
        </button>
        <button
          type="button"
          className="rounded border border-amber-700/60 bg-amber-950/30 px-3 py-1.5 text-xs text-amber-100 hover:bg-amber-900/40"
          onClick={() => {
            setParseMsg(null);
            const r = parseSqlToModel(queryText);
            if (r.ok) {
              setBuilderModel(r.model);
              setParseMsg("Loaded into the Builder tab.");
              onAfterParseToBuilder?.();
            } else {
              setParseMsg(r.reason);
            }
          }}
        >
          Load into builder
        </button>
      </div>
      {parseMsg && (
        <p className="text-[11px] text-amber-200/90">{parseMsg}</p>
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
