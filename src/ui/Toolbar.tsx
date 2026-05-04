import {
  Camera,
  LayoutGrid,
  Maximize2,
  KeyRound,
  KeySquare,
} from "lucide-react";
import { useAppStore } from "@/state/store";
import { LearnMenu } from "./LearnMenu";

type Props = {
  onScreenshot: () => void;
  onFitView: () => void;
};

export function Toolbar({ onScreenshot, onFitView }: Props) {
  const resetLayout = useAppStore((s) => s.resetLayout);
  const schema = useAppStore((s) => s.schema);
  const proposalSchema = useAppStore((s) => s.proposalSchema);
  const setSidebarTab = useAppStore((s) => s.setSidebarTab);
  const showKeys = useAppStore((s) => s.showKeys);
  const toggleShowKeys = useAppStore((s) => s.toggleShowKeys);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-700/80 bg-surface-raised px-3">
      <span className="text-sm font-semibold text-slate-100">
        3D Database Visualizer
      </span>
      {schema && (
        <span className="truncate text-xs text-slate-500">· {schema.name}</span>
      )}
      {proposalSchema && (
        <button
          type="button"
          title="Open Agent tab — schema proposal preview"
          className="ml-1 shrink-0 rounded border border-amber-700/60 bg-amber-950/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200 hover:bg-amber-900/50"
          onClick={() => setSidebarTab("agent")}
        >
          Proposal
        </button>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-1">
        <button
          type="button"
          className={`flex items-center gap-1 rounded border px-2 py-1 text-xs disabled:opacity-40 ${
            showKeys
              ? "border-sky-700/60 bg-sky-900/40 text-sky-100 hover:bg-sky-900/60"
              : "border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
          }`}
          disabled={!schema}
          onClick={toggleShowKeys}
          title="Show / hide table key chips (K)"
          aria-pressed={showKeys}
        >
          {showKeys ? (
            <KeyRound className="h-3.5 w-3.5" />
          ) : (
            <KeySquare className="h-3.5 w-3.5" />
          )}
          {showKeys ? "Keys on" : "Keys off"}
        </button>
        <button
          type="button"
          className="flex items-center gap-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-40"
          disabled={!schema}
          onClick={onFitView}
          title="Fit all tables in view (F)"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Fit
        </button>
        <button
          type="button"
          className="flex items-center gap-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-40"
          disabled={!schema}
          onClick={resetLayout}
          title="Shuffle layout (same graph, new seed) — R"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Relayout
        </button>
        <button
          type="button"
          className="flex items-center gap-1 rounded border border-sky-700/60 bg-sky-900/40 px-2 py-1 text-xs text-sky-100 hover:bg-sky-900/60 disabled:opacity-40"
          disabled={!schema}
          onClick={onScreenshot}
          title="Export PNG snapshot"
        >
          <Camera className="h-3.5 w-3.5" />
          Screenshot
        </button>
        <LearnMenu />
      </div>
    </header>
  );
}
