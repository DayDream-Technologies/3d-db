import { useAppStore } from "@/state/store";
import { LearnLink } from "./LearnLink";

export function TipsList() {
  const tips = useAppStore((s) => s.tips);
  const schema = useAppStore((s) => s.schema);
  const setSelectedTable = useAppStore((s) => s.setSelectedTable);
  const setSidebarTab = useAppStore((s) => s.setSidebarTab);

  if (!schema) {
    return (
      <div className="p-3 text-sm text-slate-500">
        Import a schema to see tips.
      </div>
    );
  }

  if (tips.length === 0) {
    return (
      <div className="space-y-2 p-3 text-sm text-slate-400">
        <p>
          No automated issues detected. Large-row / index hints need row counts
          and FK metadata in your import.
        </p>
        <div className="rounded border border-slate-700 bg-slate-900/60 p-2 text-[11px]">
          New to schema design? Explore{" "}
          <LearnLink topic="constraints" label="SQL constraints" /> and{" "}
          <LearnLink topic="createIndex" label="CREATE INDEX" />.
        </div>
      </div>
    );
  }

  return (
    <ul className="max-h-[calc(100vh-10rem)] space-y-2 overflow-y-auto p-3 text-sm">
      {tips.map((tip) => (
        <li
          key={tip.id}
          className={`rounded border p-2 text-xs ${
            tip.severity === "error"
              ? "border-red-900/50 bg-red-950/25"
              : tip.severity === "warn"
                ? "border-amber-900/40 bg-amber-950/20"
                : "border-slate-700 bg-slate-900/50"
          }`}
        >
          <div className="mb-0.5 flex items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                tip.severity === "error"
                  ? "bg-red-800 text-white"
                  : tip.severity === "warn"
                    ? "bg-amber-700 text-white"
                    : "bg-slate-700 text-slate-200"
              }`}
            >
              {tip.severity}
            </span>
            <span className="font-medium text-slate-100">{tip.title}</span>
          </div>
          <p className="text-slate-400">{tip.detail}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {tip.table && (
              <button
                type="button"
                className="text-[11px] text-sky-400 hover:underline"
                onClick={() => {
                  setSelectedTable(tip.table!);
                  setSidebarTab("table");
                }}
              >
                Open table → {tip.table}
              </button>
            )}
            {tip.learn && <LearnLink topic={tip.learn} />}
          </div>
        </li>
      ))}
    </ul>
  );
}
