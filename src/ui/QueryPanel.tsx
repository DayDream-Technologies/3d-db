import { useState } from "react";
import { useAppStore } from "@/state/store";
import { QueryBuilder } from "./QueryBuilder";
import { QueryRawEditor } from "./QueryRawEditor";
import { SavedQueriesList } from "./SavedQueriesList";
import { QueryVisualizer } from "./QueryVisualizer";
import { clsx } from "clsx";

type QTab = "visualize" | "builder" | "raw" | "saved";

export function QueryPanel() {
  const schema = useAppStore((s) => s.schema);
  const [tab, setTab] = useState<QTab>("visualize");

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
              "flex-1 border-b-2 px-2 py-2 text-xs font-medium transition-colors",
              tab === id
                ? "border-sky-500 text-sky-200"
                : "border-transparent text-slate-500 hover:text-slate-300"
            )}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
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
