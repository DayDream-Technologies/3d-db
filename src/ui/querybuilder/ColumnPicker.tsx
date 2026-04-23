import type { Schema } from "@/model/schema";

type Props = {
  schema: Schema;
  table?: string;
  column: string;
  onTable: (t: string | undefined) => void;
  onColumn: (c: string) => void;
  className?: string;
};

export function ColumnPicker({
  schema,
  table,
  column,
  onTable,
  onColumn,
  className = "",
}: Props) {
  const tableNames = schema.tables.map((t) => t.name);
  const cols =
    table && tableNames.includes(table)
      ? schema.tables.find((t) => t.name === table)!.columns.map((c) => c.name)
      : [];

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      <select
        className="max-w-[100px] rounded border border-slate-600 bg-slate-900 px-1 py-0.5 text-[10px] text-slate-200"
        value={table ?? ""}
        onChange={(e) => onTable(e.target.value || undefined)}
      >
        <option value="">(table)</option>
        {tableNames.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <select
        className="max-w-[120px] rounded border border-slate-600 bg-slate-900 px-1 py-0.5 text-[10px] text-slate-200"
        value={column}
        onChange={(e) => onColumn(e.target.value)}
        disabled={!table}
      >
        {cols.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}
