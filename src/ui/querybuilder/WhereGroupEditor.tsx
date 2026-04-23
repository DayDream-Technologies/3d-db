import type { Schema } from "@/model/schema";
import type { ValExpr, WhereItem, WhereOp } from "@/model/query";
import { ColumnPicker } from "./ColumnPicker";

const OPS: WhereOp[] = [
  "=",
  "!=",
  "<",
  "<=",
  ">",
  ">=",
  "LIKE",
  "NOT LIKE",
  "IN",
  "NOT IN",
  "IS NULL",
  "IS NOT NULL",
];

type Props = {
  schema: Schema;
  value: WhereItem | undefined;
  onChange: (w: WhereItem | undefined) => void;
  label?: string;
};

function emptyGroup(): WhereItem {
  return { t: "group", op: "AND", children: [] };
}

function newCond(): WhereItem {
  return {
    t: "cond",
    op: "=",
    left: { k: "col", column: "id" },
    right: { k: "str", v: "" },
  };
}

function valExprToCol(
  v: ValExpr
): { table?: string; column: string; mode: "col" | "other" } {
  if (v.k === "col")
    return { table: v.table, column: v.column, mode: "col" };
  return { column: v.k === "str" ? v.v : "?", mode: "other" };
}

export function WhereGroupEditor({ schema, value, onChange, label }: Props) {
  const w = value ?? emptyGroup();
  if (w.t === "cond") {
    return (
      <div className="space-y-1 rounded border border-slate-700 bg-slate-950/80 p-2">
        {label && (
          <div className="text-[10px] font-semibold text-slate-500">{label}</div>
        )}
        <OneCondition
          schema={schema}
          c={w}
          onChange={onChange}
        />
        <button
          type="button"
          className="text-[10px] text-slate-500 hover:text-slate-300"
          onClick={() => onChange(undefined)}
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1 rounded border border-slate-700 bg-slate-950/80 p-2">
      {label && (
        <div className="text-[10px] font-semibold text-slate-500">{label}</div>
      )}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-slate-500">Group</span>
        <select
          className="rounded border border-slate-600 bg-slate-900 px-1 text-[10px] text-slate-200"
          value={w.op}
          onChange={(e) =>
            onChange({
              ...w,
              op: e.target.value as "AND" | "OR",
            })
          }
        >
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>
        <button
          type="button"
          className="rounded border border-slate-600 px-1.5 text-[10px] text-slate-300 hover:bg-slate-800"
          onClick={() =>
            onChange({
              ...w,
              children: [...w.children, newCond()],
            })
          }
        >
          + cond
        </button>
        <button
          type="button"
          className="rounded border border-slate-600 px-1.5 text-[10px] text-slate-300 hover:bg-slate-800"
          onClick={() =>
            onChange({
              ...w,
              children: [
                ...w.children,
                { t: "group", op: "AND", children: [newCond()] },
              ],
            })
          }
        >
          + group
        </button>
      </div>
      <ul className="ml-2 space-y-1 border-l border-slate-700 pl-2">
        {w.children.map((ch, i) => (
          <li key={i} className="list-none">
            {ch.t === "group" ? (
              <WhereGroupEditor
                schema={schema}
                value={ch}
                onChange={(next) => {
                  if (!next) {
                    onChange({
                      ...w,
                      children: w.children.filter((_, j) => j !== i),
                    });
                    return;
                  }
                  onChange({
                    ...w,
                    children: w.children.map((c, j) => (j === i ? next : c)),
                  });
                }}
              />
            ) : (
              <div className="flex flex-wrap items-center gap-1">
                <OneCondition
                  schema={schema}
                  c={ch}
                  onChange={(next) => {
                    onChange({
                      ...w,
                      children: w.children.map((c, j) => (j === i ? next! : c)),
                    });
                  }}
                />
                <button
                  type="button"
                  className="text-[10px] text-slate-500 hover:text-slate-300"
                  onClick={() =>
                    onChange({
                      ...w,
                      children: w.children.filter((_, j) => j !== i),
                    })
                  }
                >
                  ×
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function OneCondition({
  schema,
  c,
  onChange,
}: {
  schema: Schema;
  c: Extract<WhereItem, { t: "cond" }>;
  onChange: (w: WhereItem) => void;
}) {
  const left = c.left;
  const lc = valExprToCol(left);
  const isIn = c.op === "IN" || c.op === "NOT IN";
  const isNullOp = c.op === "IS NULL" || c.op === "IS NOT NULL";

  return (
    <div className="flex flex-wrap items-end gap-1">
      {lc.mode === "col" ? (
        <ColumnPicker
          schema={schema}
          table={lc.table}
          column={lc.column}
          onTable={(t) =>
            onChange({
              ...c,
              left: { k: "col", table: t, column: lc.column },
            })
          }
          onColumn={(col) =>
            onChange({
              ...c,
              left: { k: "col", table: lc.table, column: col },
            })
          }
        />
      ) : (
        <input
          className="w-32 rounded border border-slate-600 bg-slate-900 px-1 py-0.5 font-mono text-[10px] text-slate-200"
          value={left.k === "raw" ? left.sql : "?"}
          onChange={(e) =>
            onChange({
              ...c,
              left: { k: "raw", sql: e.target.value },
            })
          }
        />
      )}
      <select
        className="rounded border border-slate-600 bg-slate-900 px-1 text-[10px] text-slate-200"
        value={c.op}
        onChange={(e) => {
          const op = e.target.value as WhereOp;
          onChange({
            ...c,
            op,
            right:
              op === "IS NULL" || op === "IS NOT NULL"
                ? undefined
                : c.right,
            inList: op === "IN" || op === "NOT IN" ? c.inList ?? [""] : undefined,
          });
        }}
      >
        {OPS.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {!isNullOp && !isIn && (
        <input
          className="w-24 rounded border border-slate-600 bg-slate-900 px-1 py-0.5 font-mono text-[10px] text-slate-200"
          placeholder="value"
          value={
            c.right?.k === "str"
              ? c.right.v
              : c.right?.k === "num"
                ? String(c.right.v)
                : c.right?.k === "col"
                  ? (c.right.table
                      ? `${c.right.table}.${c.right.column}`
                      : c.right.column) ?? ""
                  : ""
          }
          onChange={(e) => {
            const t = e.target.value;
            const n = Number(t);
            onChange({
              ...c,
              right: !Number.isNaN(n) && t !== "" && String(n) === t
                ? { k: "num", v: n }
                : { k: "str", v: t },
            });
          }}
        />
      )}
      {isIn && (
        <input
          className="min-w-[120px] flex-1 rounded border border-slate-600 bg-slate-900 px-1 py-0.5 font-mono text-[10px] text-slate-200"
          placeholder="a, b, c"
          value={(c.inList ?? []).join(", ")}
          onChange={(e) =>
            onChange({
              ...c,
              inList: e.target.value.split(",").map((s) => s.trim()),
            })
          }
        />
      )}
    </div>
  );
}
