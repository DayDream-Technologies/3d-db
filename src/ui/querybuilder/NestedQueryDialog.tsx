import { useCallback, useEffect, useRef, useState } from "react";
import { X, Trash2 } from "lucide-react";
import type { QueryModel, SelectItem, JoinItem } from "@/model/query";
import { generateSql } from "@/query/generateSql";
import { parseSqlToModel } from "@/query/parseSql";
import { useAppStore } from "@/state/store";
import { WhereGroupEditor } from "./WhereGroupEditor";
import { ColumnPicker } from "./ColumnPicker";

type Props = {
  open: boolean;
  title: string;
  value: QueryModel;
  onClose: () => void;
  onSave: (q: QueryModel) => void;
  children?: React.ReactNode;
};

type EditorMode = "raw" | "builder";

export function NestedQueryDialog({
  open,
  title,
  value,
  onClose,
  onSave,
  children,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [text, setText] = useState(() => generateSql(value));
  const [mode, setMode] = useState<EditorMode>("raw");
  const [localModel, setLocalModel] = useState<QueryModel>(value);

  useEffect(() => {
    if (open) {
      setText(generateSql(value));
      setLocalModel(value);
    }
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nested-dlg-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg border border-slate-600 bg-slate-900 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-700 px-3 py-2">
          <h2 id="nested-dlg-title" className="text-sm font-semibold text-slate-100">
            {title}
          </h2>
          <button
            type="button"
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[calc(90vh-8rem)] overflow-y-auto p-3">
          {children ?? (
            <div className="space-y-2">
              <div className="flex gap-1 border-b border-slate-700 pb-1">
                <button
                  type="button"
                  className={`rounded px-2 py-0.5 text-[10px] font-medium ${mode === "raw" ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200"}`}
                  onClick={() => {
                    setMode("raw");
                    setText(generateSql(localModel));
                  }}
                >
                  Raw SQL
                </button>
                <button
                  type="button"
                  className={`rounded px-2 py-0.5 text-[10px] font-medium ${mode === "builder" ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200"}`}
                  onClick={() => {
                    setMode("builder");
                    const r = parseSqlToModel(text);
                    if (r.ok) setLocalModel(r.model);
                  }}
                >
                  Visual Builder
                </button>
              </div>

              {mode === "raw" ? (
                <>
                  <p className="text-[11px] text-slate-500">
                    Edit SQL for this nested block, then apply.
                  </p>
                  <textarea
                    className="h-48 w-full rounded border border-slate-600 bg-slate-950 p-2 font-mono text-xs text-slate-200"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </>
              ) : (
                <MiniBuilder model={localModel} onChange={setLocalModel} />
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded bg-sky-600 px-3 py-1.5 text-xs text-white hover:bg-sky-500"
                  onClick={() => {
                    if (mode === "builder") {
                      onSave(localModel);
                    } else {
                      const r = parseSqlToModel(text);
                      if (r.ok) onSave(r.model);
                      else alert(r.reason);
                    }
                  }}
                >
                  {mode === "builder" ? "Apply" : "Apply parsed SQL"}
                </button>
                <button
                  type="button"
                  className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                  onClick={() => onSave(value)}
                >
                  Use original
                </button>
              </div>

              {mode === "builder" && (
                <pre className="max-h-24 overflow-auto rounded border border-slate-700 bg-slate-950/50 p-2 font-mono text-[10px] text-slate-400">
                  {generateSql(localModel)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const AGG = ["COUNT", "SUM", "AVG", "MIN", "MAX"] as const;

function MiniBuilder({
  model,
  onChange,
}: {
  model: QueryModel;
  onChange: (m: QueryModel) => void;
}) {
  const schema = useAppStore((s) => s.schema);
  if (!schema) return <p className="text-xs text-slate-500">No schema loaded.</p>;

  const firstTable = schema.tables[0]?.name ?? "t";

  const apply = useCallback(
    (next: QueryModel) => onChange(next),
    [onChange]
  );

  return (
    <div className="space-y-2 text-[11px]">
      {/* DISTINCT */}
      <label className="flex items-center gap-1 text-slate-400">
        <input
          type="checkbox"
          checked={model.distinct}
          onChange={(e) => apply({ ...model, distinct: e.target.checked })}
        />
        DISTINCT
      </label>

      {/* SELECT */}
      <div>
        <div className="mb-0.5 flex items-center justify-between text-[10px] font-semibold text-slate-400">
          <span>SELECT</span>
          <button
            type="button"
            className="text-sky-400"
            onClick={() =>
              apply({ ...model, select: [...model.select, { k: "col", table: firstTable, column: "id" }] })
            }
          >
            + col
          </button>
        </div>
        {model.select.map((s, i) => (
          <div key={i} className="mb-0.5 flex flex-wrap items-center gap-1">
            <select
              className="rounded border border-slate-600 bg-slate-900 px-1 text-[10px] text-slate-200"
              value={s.k}
              onChange={(e) => {
                const k = e.target.value as SelectItem["k"];
                let n: SelectItem;
                if (k === "star") n = { k: "star" };
                else if (k === "col") n = { k: "col", table: firstTable, column: "id" };
                else if (k === "agg") n = { k: "agg", fn: "COUNT", arg: { k: "col", column: "*" } };
                else n = { k: "raw", sql: "1" };
                const next = [...model.select];
                next[i] = n;
                apply({ ...model, select: next });
              }}
            >
              <option value="col">col</option>
              <option value="star">*</option>
              <option value="agg">agg</option>
              <option value="raw">raw</option>
            </select>
            {s.k === "col" && (
              <ColumnPicker
                schema={schema}
                table={s.table}
                column={s.column}
                onTable={(t) => {
                  const n = [...model.select];
                  n[i] = { k: "col", table: t, column: s.column, alias: s.alias };
                  apply({ ...model, select: n });
                }}
                onColumn={(col) => {
                  const n = [...model.select];
                  n[i] = { k: "col", table: s.table, column: col, alias: s.alias };
                  apply({ ...model, select: n });
                }}
              />
            )}
            {s.k === "agg" && (
              <>
                <select
                  className="rounded border border-slate-600 bg-slate-900 px-1 text-[10px]"
                  value={s.fn}
                  onChange={(e) => {
                    const n = [...model.select];
                    n[i] = { ...s, fn: e.target.value as (typeof AGG)[number] };
                    apply({ ...model, select: n });
                  }}
                >
                  {AGG.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <input
                  className="w-16 rounded border border-slate-600 font-mono text-[10px]"
                  value={s.arg.k === "col" ? s.arg.column : s.arg.k === "raw" ? s.arg.sql : ""}
                  onChange={(e) => {
                    const n = [...model.select];
                    n[i] = { ...s, arg: { k: "col", column: e.target.value || "*" } };
                    apply({ ...model, select: n });
                  }}
                />
              </>
            )}
            {s.k === "raw" && (
              <input
                className="flex-1 font-mono text-[10px]"
                value={s.sql}
                onChange={(e) => {
                  const n = [...model.select];
                  n[i] = { k: "raw", sql: e.target.value, alias: s.alias };
                  apply({ ...model, select: n });
                }}
              />
            )}
            <button type="button" className="text-red-400" onClick={() => apply({ ...model, select: model.select.filter((_, j) => j !== i) })}>
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
      </div>

      {/* FROM */}
      <div>
        <span className="text-[10px] font-semibold text-slate-400">FROM</span>
        <select
          className="ml-1 rounded border border-slate-600 bg-slate-900 px-1 text-[10px]"
          value={model.from.kind === "table" ? model.from.name : ""}
          onChange={(e) => apply({ ...model, from: { kind: "table", name: e.target.value, alias: e.target.value[0] ?? "t" } })}
        >
          {schema.tables.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
        </select>
        <input
          className="ml-1 w-12 rounded border border-slate-600 text-[10px]"
          placeholder="alias"
          value={(model.from.kind === "table" ? model.from.alias : "") ?? ""}
          onChange={(e) => {
            if (model.from.kind === "table")
              apply({ ...model, from: { kind: "table", name: model.from.name, alias: e.target.value || undefined } });
          }}
        />
      </div>

      {/* JOINs */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-slate-400">JOINs</span>
          <button
            type="button"
            className="text-[10px] text-sky-400"
            onClick={() =>
              apply({
                ...model,
                joins: [...model.joins, { kind: "INNER", from: { kind: "table", name: firstTable, alias: "" }, on: { t: "group", op: "AND", children: [] } }],
              })
            }
          >
            + join
          </button>
        </div>
        {model.joins.map((j, i) => (
          <div key={i} className="mt-1 space-y-1 rounded border border-slate-700/50 p-1">
            <div className="flex gap-1">
              <select
                className="rounded border border-slate-600 bg-slate-900 text-[10px]"
                value={j.kind}
                onChange={(e) => {
                  const n = [...model.joins];
                  n[i] = { ...j, kind: e.target.value as JoinItem["kind"] };
                  apply({ ...model, joins: n });
                }}
              >
                <option value="INNER">INNER</option>
                <option value="LEFT">LEFT</option>
                <option value="RIGHT">RIGHT</option>
                <option value="FULL">FULL</option>
              </select>
              {j.from.kind === "table" && (
                <select
                  className="rounded border border-slate-600 bg-slate-900 text-[10px]"
                  value={j.from.name}
                  onChange={(e) => {
                    const n = [...model.joins];
                    n[i] = { ...j, from: { kind: "table", name: e.target.value, alias: j.from.alias } };
                    apply({ ...model, joins: n });
                  }}
                >
                  {schema.tables.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
              )}
              <button type="button" className="text-red-400" onClick={() => apply({ ...model, joins: model.joins.filter((_, k) => k !== i) })}>
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </div>
            {j.on && (
              <WhereGroupEditor
                schema={schema}
                value={j.on.children.length ? { t: "group", op: j.on.op, children: j.on.children } : undefined}
                onChange={(w) => {
                  const n = [...model.joins];
                  n[i] = { ...j, on: w ? (w.t === "group" ? w : { t: "group", op: "AND", children: [w] }) : { t: "group", op: "AND", children: [] } };
                  apply({ ...model, joins: n });
                }}
                label="ON"
              />
            )}
          </div>
        ))}
      </div>

      {/* WHERE */}
      <WhereGroupEditor
        schema={schema}
        value={model.where}
        onChange={(w) => apply({ ...model, where: w })}
        label="WHERE"
      />

      {/* GROUP BY */}
      <div>
        <span className="text-[10px] font-semibold text-slate-400">GROUP BY</span>
        <div className="mt-0.5 flex flex-wrap gap-1">
          {model.groupBy.map((g, i) => (
            <span key={i} className="inline-flex items-center gap-0.5 rounded bg-slate-800 px-1 text-[10px]">
              {g}
              <button type="button" className="text-red-400" onClick={() => apply({ ...model, groupBy: model.groupBy.filter((_, j) => j !== i) })}>×</button>
            </span>
          ))}
          <input
            className="w-28 rounded border border-slate-600 bg-slate-950 text-[10px]"
            placeholder="col"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const t = (e.target as HTMLInputElement).value.trim();
                (e.target as HTMLInputElement).value = "";
                if (t) apply({ ...model, groupBy: [...model.groupBy, t] });
              }
            }}
          />
        </div>
      </div>

      {/* ORDER BY */}
      <div>
        <span className="text-[10px] font-semibold text-slate-400">ORDER BY</span>
        {model.orderBy.map((o, i) => (
          <div key={i} className="mt-0.5 flex gap-1">
            <input
              className="w-24 rounded border border-slate-600 text-[10px]"
              value={o.expr}
              onChange={(e) => {
                const n = [...model.orderBy];
                n[i] = { ...n[i]!, expr: e.target.value };
                apply({ ...model, orderBy: n });
              }}
            />
            <select className="text-[10px]" value={o.dir} onChange={(e) => { const n = [...model.orderBy]; n[i] = { ...n[i]!, dir: e.target.value as "ASC"|"DESC" }; apply({ ...model, orderBy: n }); }}>
              <option value="ASC">ASC</option>
              <option value="DESC">DESC</option>
            </select>
            <button type="button" className="text-red-400" onClick={() => apply({ ...model, orderBy: model.orderBy.filter((_, j) => j !== i) })}>
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
        <button type="button" className="text-[10px] text-sky-400" onClick={() => apply({ ...model, orderBy: [...model.orderBy, { expr: "1", dir: "ASC" }] })}>+ order</button>
      </div>

      {/* LIMIT / OFFSET */}
      <div className="flex gap-2">
        <div>
          <label className="text-[10px] text-slate-500">LIMIT</label>
          <input type="number" className="w-16 rounded border border-slate-600 text-[10px]" value={model.limit ?? ""} min={0}
            onChange={(e) => apply({ ...model, limit: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
        <div>
          <label className="text-[10px] text-slate-500">OFFSET</label>
          <input type="number" className="w-16 rounded border border-slate-600 text-[10px]" value={model.offset ?? ""} min={0}
            onChange={(e) => apply({ ...model, offset: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
      </div>
    </div>
  );
}
