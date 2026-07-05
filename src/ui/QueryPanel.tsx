import { useState, useMemo } from "react";
import { useAppStore } from "@/state/store";
import { generateSql } from "@/query/generateSql";
import { QueryBuilder } from "./QueryBuilder";
import { QueryRawEditor } from "./QueryRawEditor";
import { SavedQueriesList } from "./SavedQueriesList";
import { QueryVisualizer } from "./QueryVisualizer";
import { clsx } from "clsx";

type QTab = "visualize" | "builder" | "raw" | "saved";

export function QueryPanel() {
  const schema = useAppStore((s) => s.schema);
  const queryText = useAppStore((s) => s.queryText);
  const builderModel = useAppStore((s) => s.builderModel);
  const [tab, setTab] = useState<QTab>("visualize");

  const diverged = useMemo(() => {
    try {
      const builderSql = generateSql(builderModel);
      return queryText.trim() !== builderSql.trim();
    } catch {
      return true;
    }
  }, [queryText, builderModel]);

  if (!schema) {
    return (
      <div className="p-3 text-sm text-slate-500">Import a schema first.</div>
    );
  }

  return (
    <div className="p-0 text-sm">
      <div className="flex border-b border-slate-800">
        {(
          [
            ["visualize", "Visualizer"],
            ["builder", "Builder"],
            ["raw", "Raw SQL"],
            ["saved", "Saved"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={clsx(
              "relative flex-1 border-b-2 px-2 py-2 text-xs font-medium transition-colors",
              tab === id
                ? "border-sky-500 text-sky-200"
                : "border-transparent text-slate-500 hover:text-slate-300"
            )}
            onClick={() => setTab(id)}
          >
            {label}
            {id === "raw" && diverged && tab !== "raw" && (
              <span
                className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-400"
                title="Raw SQL differs from Builder — click 'Load into builder' to sync"
              />
            )}
          </button>
        ))}
      </div>
      {diverged && tab === "raw" && (
        <div className="mx-3 mt-1 rounded border border-amber-700/50 bg-amber-950/30 px-2 py-1 text-[10px] text-amber-200/80">
          Raw SQL differs from Builder. Use &quot;Load into builder&quot; to sync changes back.
        </div>
      )}
      <div className="px-3 pt-1 pb-3 sm:px-5">
        {tab === "visualize" && <QueryVisualizer />}
        {tab === "builder" && <QueryBuilder />}
        {tab === "raw" && (
          <QueryRawEditor
            onAfterParseToBuilder={() => setTab("builder")}
          />
        )}
        {tab === "saved" && <SavedQueriesList />}
      </div>
    </div>
  );
}
