import { useAppStore } from "@/state/store";
import { rowCountPercentiles } from "@/scene/tableScale";

export function TablePanel() {
  const schema = useAppStore((s) => s.schema);
  const rawSchema = useAppStore((s) => s.rawSchema);
  const selectedTable = useAppStore((s) => s.selectedTable);
  const setRowCount = useAppStore((s) => s.setRowCount);
  const setSelectedTable = useAppStore((s) => s.setSelectedTable);

  if (!schema || !selectedTable) {
    return (
      <div className="p-3 text-sm text-slate-500">
        Click a table in the 3D view to edit row counts and inspect columns.
      </div>
    );
  }

  const table = schema.tables.find((t) => t.name === selectedTable);
  const base = rawSchema?.tables.find((t) => t.name === selectedTable);
  if (!table) return null;

  const { p95, p99 } = rowCountPercentiles(schema);
  const rc = table.rowCount ?? 0;
  let bloatLabel = "n/a";
  if (rc > 0) {
    if (rc >= p99) bloatLabel = "very high (≥p99)";
    else if (rc >= p95) bloatLabel = "high (≥p95)";
    else bloatLabel = "typical";
  }

  return (
    <div className="space-y-3 p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-100">{table.name}</h3>
        <button
          type="button"
          className="text-xs text-slate-500 hover:text-slate-300"
          onClick={() => setSelectedTable(null)}
        >
          Clear selection
        </button>
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-400">
          Row count (overrides import)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 font-mono text-xs text-slate-200"
            value={table.rowCount ?? ""}
            placeholder="unknown"
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") {
                setRowCount(table.name, undefined);
                return;
              }
              const n = Number(v);
              if (!Number.isNaN(n)) setRowCount(table.name, n);
            }}
          />
          <button
            type="button"
            className="shrink-0 rounded border border-slate-600 px-2 text-xs text-slate-400 hover:bg-slate-800"
            onClick={() => setRowCount(table.name, undefined)}
            title="Use imported value"
          >
            Reset
          </button>
        </div>
        {base?.rowCount != null && (
          <p className="mt-1 text-[11px] text-slate-500">
            Imported: {base.rowCount.toLocaleString()}
          </p>
        )}
        <p className="mt-1 text-[11px] text-slate-500">
          Bloat indicator (vs this schema):{" "}
          <span className="text-slate-300">{bloatLabel}</span>
        </p>
      </div>
      <div>
        <div className="mb-1 text-xs font-semibold text-slate-400">Columns</div>
        <ul className="max-h-64 space-y-1 overflow-y-auto rounded border border-slate-700 bg-slate-950/80 p-2 text-xs">
          {table.columns.map((c) => (
            <li
              key={c.name}
              className="flex flex-wrap items-baseline gap-1 border-b border-slate-800/80 py-1 last:border-0"
            >
              <span className="font-mono text-sky-300">{c.name}</span>
              <span className="text-slate-500">{c.type}</span>
              {c.primaryKey && (
                <span className="rounded bg-amber-900/50 px-1 text-[10px] text-amber-200">
                  PK
                </span>
              )}
              {c.foreignKey && (
                <span className="rounded bg-sky-900/40 px-1 text-[10px] text-sky-200">
                  FK→{c.foreignKey.table}.{c.foreignKey.column}
                </span>
              )}
              {c.indexed && (
                <span className="text-[10px] text-emerald-400">indexed</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
