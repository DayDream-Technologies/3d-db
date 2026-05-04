import { useAppStore } from "@/state/store";

export function Legend() {
  const proposalSchema = useAppStore((s) => s.proposalSchema);

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-10 max-w-xs rounded-lg border border-slate-700/80 bg-slate-900/90 p-3 text-xs text-slate-300 shadow-xl backdrop-blur">
      <div className="mb-2 font-semibold text-slate-100">Legend</div>
      {proposalSchema && (
        <div className="mb-2 space-y-1 rounded border border-amber-800/50 bg-amber-950/30 p-2 text-[11px] text-amber-100/95">
          <div className="font-medium text-amber-50">Proposal preview</div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-sm bg-green-500" />
            <span>New table vs baseline</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-sm bg-amber-500" />
            <span>Modified table</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-sm bg-green-400/80" />
            <span>New FK edge</span>
          </div>
        </div>
      )}
      <div className="mb-2 space-y-1">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm bg-emerald-500" />
          <span>Row count below ~p95 (smaller / cooler)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm bg-yellow-500" />
          <span>High row count (~p95+)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm bg-red-500" />
          <span>Very high row count (~p99+)</span>
        </div>
      </div>
      <div className="border-t border-slate-700 pt-2 text-slate-400">
        Box <strong>volume</strong> scales with row count (∛n). Hover column chips
        to trace FK/PK links across tables.
      </div>
    </div>
  );
}
