import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/state/store";
import { inferRelationships, type Schema } from "@/model/schema";
import type { QueryModel, SelectItem, FromSource, JoinItem, CteDef, OrderKey, UnionArm } from "@/model/query";
import { newEmptyQueryModel } from "@/model/query";
import { generateSql } from "@/query/generateSql";
import { WhereGroupEditor } from "./querybuilder/WhereGroupEditor";
import { ColumnPicker } from "./querybuilder/ColumnPicker";
import { NestedQueryDialog } from "./querybuilder/NestedQueryDialog";
import { LearnLink } from "./LearnLink";
import { Save, Plus, Trash2, Wand2 } from "lucide-react";

const AGG = ["COUNT", "SUM", "AVG", "MIN", "MAX"] as const;

function firstTableName(schema: Schema | null): string {
  return schema?.tables[0]?.name ?? "t";
}

export function QueryBuilder() {
  const schema = useAppStore((s) => s.schema);
  const model = useAppStore((s) => s.builderModel);
  const setBuilderModel = useAppStore((s) => s.setBuilderModel);
  const activeId = useAppStore((s) => s.activeQueryId);
  const runHighlight = useAppStore((s) => s.runQueryHighlight);
  const newBuilderQuery = useAppStore((s) => s.newBuilderQuery);
  const saveCurrentQuery = useAppStore((s) => s.saveCurrentQuery);
  const updateActiveQuery = useAppStore((s) => s.updateActiveQuery);

  const [nested, setNested] = useState<{
    kind: "cte" | "from" | "union" | "join" | null;
    index?: number;
    draft?: QueryModel;
  }>({ kind: null });

  const rels = useMemo(
    () => (schema ? inferRelationships(schema) : []),
    [schema]
  );

  const apply = useCallback(
    (next: QueryModel) => {
      setBuilderModel(next);
    },
    [setBuilderModel]
  );

  useEffect(() => {
    if (!schema?.tables.length) return;
    const m = useAppStore.getState().builderModel;
    const f = m.from;
    if (f.kind !== "table") return;
    if (schema.tables.some((t) => t.name === f.name)) return;
    const t0 = firstTableName(schema);
    setBuilderModel({
      ...m,
      from: { kind: "table", name: t0, alias: t0[0] ?? "t" },
    });
  }, [schema, setBuilderModel]);

  const sql = useMemo(() => {
    try {
      return generateSql(model);
    } catch {
      return "-- error generating SQL";
    }
  }, [model]);

  const suggestJoins = useMemo(() => {
    if (!schema) return [] as { label: string; join: JoinItem }[];
    const fromName =
      model.from.kind === "table" ? model.from.name : "";
    return rels
      .filter(
        (r) =>
          r.fromTable === fromName ||
          model.joins.some(
            (j) =>
              j.from.kind === "table" && j.from.name === r.toTable
          ) ||
          fromName === ""
      )
      .map((r) => {
        const toAlias = r.toTable[0] ?? "x";
        const on: NonNullable<JoinItem["on"]> = {
          t: "group",
          op: "AND",
          children: [
            {
              t: "cond",
              op: "=",
              left: {
                k: "col",
                table: r.fromTable[0] ?? "a",
                column: r.fromColumn,
              },
              right: { k: "col", table: toAlias, column: r.toColumn },
            },
          ],
        };
        return {
          label: `${r.fromTable}.${r.fromColumn} = ${r.toTable}.${r.toColumn}`,
          join: {
            kind: "INNER" as const,
            from: {
              kind: "table" as const,
              name: r.toTable,
              alias: toAlias,
            },
            on,
          },
        };
      });
  }, [rels, schema, model.from, model.joins]);

  if (!schema) return null;

  const addSelectCol = () => {
    const t0 = firstTableName(schema);
    const sel: SelectItem = { k: "col", table: t0, column: "id" };
    apply({ ...model, select: [...model.select, sel] });
  };

  const addCte = () => {
    const c: CteDef = {
      name: `cte_${(model.ctes?.length ?? 0) + 1}`,
      query: newEmptyQueryModel({ name: "cte" }),
    };
    apply({ ...model, ctes: [...(model.ctes ?? []), c] });
  };

  const setFromTable = (name: string) => {
    const alias = name[0] ?? "t";
    apply({ ...model, from: { kind: "table", name, alias } });
  };

  const addJoin = (j?: JoinItem) => {
    if (j) {
      apply({ ...model, joins: [...(model.joins ?? []), j] });
      return;
    }
    const t0 = firstTableName(schema);
    const ji: JoinItem = {
      kind: "INNER",
      from: { kind: "table", name: t0, alias: "" },
      on: { t: "group", op: "AND", children: [] },
    };
    apply({ ...model, joins: [...(model.joins ?? []), ji] });
  };

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-0.5 block text-[10px] text-slate-500">Name</label>
          <input
            className="w-40 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-slate-200"
            value={model.name}
            onChange={(e) => apply({ ...model, name: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] text-slate-500">Notes</label>
          <input
            className="w-48 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-slate-200"
            value={model.notes}
            onChange={(e) => apply({ ...model, notes: e.target.value })}
          />
        </div>
        <button
          type="button"
          className="mt-3 flex items-center gap-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
          onClick={newBuilderQuery}
        >
          <Plus className="h-3 w-3" /> New
        </button>
        <button
          type="button"
          className="mt-3 flex items-center gap-1 rounded bg-sky-600 px-2 py-1 text-xs text-white hover:bg-sky-500"
          onClick={saveCurrentQuery}
        >
          <Save className="h-3 w-3" />
          {activeId ? "Save" : "Save to list"}
        </button>
        {activeId && (
          <button
            type="button"
            className="mt-3 rounded border border-amber-700/60 bg-amber-950/50 px-2 py-1 text-xs text-amber-100 hover:bg-amber-900/50"
            onClick={updateActiveQuery}
          >
            Update
          </button>
        )}
      </div>

      <details className="rounded border border-slate-700">
        <summary className="cursor-pointer px-2 py-1 text-xs font-medium text-slate-300">
          WITH (CTE){" "}
          <LearnLink topic="select" label="W3" />
        </summary>
        <div className="space-y-2 p-2">
          <button
            type="button"
            className="text-[10px] text-sky-400 hover:underline"
            onClick={addCte}
          >
            + CTE
          </button>
          {(model.ctes ?? []).map((c, i) => (
            <div
              key={c.name + i}
              className="flex items-center justify-between gap-1 rounded border border-slate-700/80 bg-slate-950/60 p-1"
            >
              <input
                className="w-32 rounded border border-slate-600 bg-slate-900 px-1 text-[10px] text-slate-200"
                value={c.name}
                onChange={(e) => {
                  const ctes = [...(model.ctes ?? [])];
                  ctes[i] = { ...c, name: e.target.value };
                  apply({ ...model, ctes });
                }}
              />
              <span className="text-[10px] text-slate-500">body…</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="text-[10px] text-sky-400"
                  onClick={() =>
                    setNested({
                      kind: "cte",
                      index: i,
                      draft: c.query,
                    })
                  }
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="text-[10px] text-red-400"
                  onClick={() => {
                    const ctes = [...(model.ctes ?? [])].filter(
                      (_, j) => j !== i
                    );
                    apply({ ...model, ctes });
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </details>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={model.distinct}
            onChange={(e) =>
              apply({ ...model, distinct: e.target.checked })
            }
          />
          DISTINCT
        </label>
        <LearnLink topic="select" />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">SELECT</span>
          <button
            type="button"
            className="text-[10px] text-sky-400"
            onClick={addSelectCol}
          >
            + column
          </button>
        </div>
        <ul className="space-y-1">
          {model.select.map((s, i) => (
            <li
              key={i}
              className="flex flex-wrap items-center gap-1 rounded border border-slate-700/60 bg-slate-950/50 p-1"
            >
              <select
                className="max-w-[90px] rounded border border-slate-600 bg-slate-900 px-1 text-[10px] text-slate-200"
                value={s.k}
                onChange={(e) => {
                  const k = e.target.value as SelectItem["k"];
                  const t0 = firstTableName(schema);
                  let n: SelectItem;
                  if (k === "star")
                    n = { k: "star" };
                  else if (k === "col")
                    n = { k: "col", table: t0, column: "id" };
                  else if (k === "agg")
                    n = {
                      k: "agg",
                      fn: "COUNT",
                      arg: { k: "col", table: t0, column: "*" },
                    };
                  else n = { k: "raw", sql: "1" };
                  const next = [...model.select];
                  next[i!] = n;
                  apply({ ...model, select: next });
                }}
              >
                <option value="col">col</option>
                <option value="star">*</option>
                <option value="agg">agg</option>
                <option value="raw">raw</option>
              </select>
              {s.k === "col" && (
                <>
                  <ColumnPicker
                    schema={schema}
                    table={s.table}
                    column={s.column}
                    onTable={(t) => {
                      const n = [...model.select];
                      (n[i] as SelectItem & { k: "col" }) = {
                        k: "col",
                        table: t,
                        column: s.column,
                        alias: s.alias,
                      };
                      apply({ ...model, select: n });
                    }}
                    onColumn={(col) => {
                      const n: SelectItem[] = [...model.select];
                      n[i] = {
                        k: "col",
                        table: s.table,
                        column: col,
                        alias: s.alias,
                      };
                      apply({ ...model, select: n });
                    }}
                  />
                  <input
                    placeholder="AS"
                    className="w-20 rounded border border-slate-600 bg-slate-900 px-1 text-[10px] text-slate-200"
                    value={s.alias ?? ""}
                    onChange={(e) => {
                      const n: SelectItem[] = [...model.select];
                      if (s.k === "col")
                        n[i] = {
                          ...s,
                          alias: e.target.value || undefined,
                        };
                      apply({ ...model, select: n });
                    }}
                  />
                </>
              )}
              {s.k === "agg" && (
                <>
                  <select
                    className="rounded border border-slate-600 bg-slate-900 px-1 text-[10px] text-slate-200"
                    value={s.fn}
                    onChange={(e) => {
                      if (s.k !== "agg") return;
                      const n: SelectItem[] = [...model.select];
                      n[i] = {
                        ...s,
                        fn: e.target.value as (typeof AGG)[number],
                      };
                      apply({ ...model, select: n });
                    }}
                  >
                    {AGG.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                  <label className="text-[9px] text-slate-500">
                    <input
                      type="checkbox"
                      checked={!!s.distinctArg}
                      onChange={(e) => {
                        if (s.k !== "agg") return;
                        const n: SelectItem[] = [...model.select];
                        n[i] = { ...s, distinctArg: e.target.checked };
                        apply({ ...model, select: n });
                      }}
                    />{" "}
                    DISTINCT
                  </label>
                  <input
                    className="w-20 rounded border border-slate-600 font-mono text-[10px] text-slate-200"
                    value={
                      s.arg.k === "col" ? s.arg.column : s.arg.k === "raw" ? s.arg.sql : ""
                    }
                    onChange={(e) => {
                      if (s.k !== "agg") return;
                      const n: SelectItem[] = [...model.select];
                      n[i] = {
                        ...s,
                        arg: { k: "col", column: e.target.value || "*" },
                      };
                      apply({ ...model, select: n });
                    }}
                  />
                  <input
                    placeholder="AS"
                    className="w-20 rounded border border-slate-600 text-[10px] text-slate-200"
                    value={s.alias ?? ""}
                    onChange={(e) => {
                      if (s.k !== "agg") return;
                      const n: SelectItem[] = [...model.select];
                      n[i] = { ...s, alias: e.target.value || undefined };
                      apply({ ...model, select: n });
                    }}
                  />
                </>
              )}
              {s.k === "raw" && (
                <input
                  className="min-w-[120px] flex-1 font-mono text-[10px] text-slate-200"
                  value={s.sql}
                  onChange={(e) => {
                    if (s.k !== "raw") return;
                    const n: SelectItem[] = [...model.select];
                    n[i] = {
                      k: "raw",
                      sql: e.target.value,
                      alias: s.alias,
                    };
                    apply({ ...model, select: n });
                  }}
                />
              )}
              <button
                type="button"
                className="ml-auto text-red-400"
                onClick={() =>
                  apply({
                    ...model,
                    select: model.select.filter((_, j) => j !== i),
                  })
                }
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="mb-1 text-xs font-semibold text-slate-400">FROM</div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded border border-slate-600 bg-slate-900 px-2 text-xs"
            value={model.from.kind}
            onChange={(e) => {
              if (e.target.value === "subquery") {
                apply({
                  ...model,
                  from: {
                    kind: "subquery",
                    query: newEmptyQueryModel({ name: "sub" }),
                    alias: "s",
                  } as FromSource,
                });
                return;
              }
              {
                const n = firstTableName(schema);
                apply({
                  ...model,
                  from: { kind: "table", name: n, alias: n[0] ?? "t" },
                });
              }
            }}
          >
            <option value="table">Table</option>
            <option value="subquery">Subquery (edit via dialog)</option>
          </select>
          {model.from.kind === "table" && (
            <>
              <select
                className="rounded border border-slate-600 bg-slate-900 px-2 text-xs"
                value={model.from.name}
                onChange={(e) => setFromTable(e.target.value)}
              >
                {schema.tables.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
              <input
                className="w-16 rounded border border-slate-600 text-xs"
                value={model.from.alias ?? ""}
                onChange={(e) => {
                  if (model.from.kind !== "table") return;
                  apply({
                    ...model,
                    from: {
                      kind: "table",
                      name: model.from.name,
                      alias: e.target.value || undefined,
                    },
                  });
                }}
                placeholder="alias"
              />
            </>
          )}
          {model.from.kind === "subquery" && (
            <button
              type="button"
              className="text-xs text-sky-400"
              onClick={() => {
                if (model.from.kind === "subquery")
                  setNested({ kind: "from", draft: model.from.query });
              }}
            >
              Edit subquery
            </button>
          )}
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-400">
          <span>JOINs</span>
          <div className="flex flex-wrap gap-1">
            {suggestJoins.slice(0, 4).map((sug, k) => (
              <button
                key={k}
                type="button"
                title={sug.label}
                className="max-w-[140px] truncate rounded border border-sky-800/50 px-1 py-0.5 text-[9px] text-sky-300 hover:bg-sky-950/50"
                onClick={() => addJoin(sug.join)}
              >
                <Wand2 className="inline h-2.5 w-2.5" /> {sug.join.from.kind === "table" ? sug.join.from.name : "?"}
              </button>
            ))}
            <button
              type="button"
              className="text-[10px] text-sky-400"
              onClick={() => addJoin()}
            >
              + join
            </button>
          </div>
        </div>
        <LearnLink topic="joins" className="mb-1" />
        <ul className="space-y-1">
          {(model.joins ?? []).map((j, i) => (
            <li
              key={i}
              className="space-y-1 rounded border border-slate-700/50 p-1 text-[10px]"
            >
              <div className="flex flex-wrap gap-1">
                <select
                  value={j.kind}
                  onChange={(e) => {
                    const n = [...(model.joins ?? [])];
                    n[i] = { ...j, kind: e.target.value as JoinItem["kind"] };
                    apply({ ...model, joins: n });
                  }}
                  className="rounded border border-slate-600 bg-slate-900"
                >
                  <option value="INNER">INNER</option>
                  <option value="LEFT">LEFT</option>
                  <option value="RIGHT">RIGHT</option>
                  <option value="FULL">FULL</option>
                </select>
                {j.from.kind === "table" && (
                  <>
                    <select
                      className="rounded border border-slate-600 bg-slate-900"
                      value={j.from.name}
                      onChange={(e) => {
                        const n = [...(model.joins ?? [])];
                        n[i] = {
                          ...j,
                          from: {
                            kind: "table",
                            name: e.target.value,
                            alias: j.from.alias,
                          },
                        };
                        apply({ ...model, joins: n });
                      }}
                    >
                      {schema.tables.map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <input
                      className="w-14"
                      value={j.from.alias ?? ""}
                      placeholder="al"
                      onChange={(e) => {
                        if (j.from.kind !== "table") return;
                        const n = [...(model.joins ?? [])];
                        n[i] = {
                          ...j,
                          from: {
                            kind: "table",
                            name: j.from.name,
                            alias: e.target.value || undefined,
                          },
                        };
                        apply({ ...model, joins: n });
                      }}
                    />
                  </>
                )}
                <button
                  type="button"
                  className="text-red-400"
                  onClick={() => {
                    const n = (model.joins ?? []).filter((_, k) => k !== i);
                    apply({ ...model, joins: n });
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              {j.on && (
                <WhereGroupEditor
                  schema={schema}
                  value={
                    j.on.children.length
                      ? { t: "group", op: j.on.op, children: j.on.children }
                      : undefined
                  }
                  onChange={(w) => {
                    const n = [...(model.joins ?? [])];
                    n[i] = {
                      ...j,
                      on: w
                        ? w.t === "group"
                          ? w
                          : { t: "group", op: "AND", children: [w] }
                        : { t: "group", op: "AND", children: [] },
                    };
                    apply({ ...model, joins: n });
                  }}
                  label="ON"
                />
              )}
            </li>
          ))}
        </ul>
      </div>

      <WhereGroupEditor
        schema={schema}
        value={model.where}
        onChange={(w) => apply({ ...model, where: w })}
        label="WHERE"
      />

      <div>
        <div className="mb-1 text-xs font-semibold text-slate-400">GROUP BY</div>
        <div className="flex flex-wrap gap-1">
          {model.groupBy.map((g, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded bg-slate-800 px-1 text-[10px] text-slate-200"
            >
              {g}
              <button
                type="button"
                className="text-red-400"
                onClick={() =>
                  apply({
                    ...model,
                    groupBy: model.groupBy.filter((_, j) => j !== i),
                  })
                }
              >
                ×
              </button>
            </span>
          ))}
          <select
            className="max-w-[150px] rounded border border-slate-600 bg-slate-900 px-1 py-0.5 text-[10px] text-slate-200"
            value=""
            onChange={(e) => {
              if (e.target.value)
                apply({ ...model, groupBy: [...model.groupBy, e.target.value] });
              e.target.value = "";
            }}
          >
            <option value="">+ column…</option>
            {schema.tables.map((tbl) =>
              tbl.columns.map((col) => {
                const val = model.from.kind === "table" && model.from.alias
                  ? `${model.from.name === tbl.name ? model.from.alias : tbl.name}.${col.name}`
                  : `${tbl.name}.${col.name}`;
                return (
                  <option key={`${tbl.name}.${col.name}`} value={val}>
                    {tbl.name}.{col.name}
                  </option>
                );
              })
            )}
          </select>
          <input
            className="w-32 rounded border border-slate-600 bg-slate-950 text-[10px] text-slate-200"
            placeholder="or type expr"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const t = (e.target as HTMLInputElement).value.trim();
                (e.target as HTMLInputElement).value = "";
                if (t)
                  apply({ ...model, groupBy: [...model.groupBy, t] });
              }
            }}
          />
        </div>
        <LearnLink topic="groupBy" />
      </div>

      {model.groupBy.length > 0 && (
        <WhereGroupEditor
          schema={schema}
          value={model.having}
          onChange={(w) => apply({ ...model, having: w })}
          label="HAVING"
        />
      )}

      <div>
        <div className="mb-1 text-xs font-semibold text-slate-400">ORDER BY</div>
        {(model.orderBy ?? []).map((o, i) => (
          <div key={i} className="mb-1 flex flex-wrap gap-1 text-[10px]">
            <select
              className="max-w-[130px] rounded border border-slate-600 bg-slate-900 px-1 text-[10px] text-slate-200"
              value={o.expr}
              onChange={(e) => {
                const n: OrderKey[] = [...(model.orderBy ?? [])];
                n[i] = { ...n[i]!, expr: e.target.value };
                apply({ ...model, orderBy: n });
              }}
            >
              <option value={o.expr}>{o.expr}</option>
              {schema.tables.flatMap((tbl) =>
                tbl.columns.map((col) => {
                  const val = `${tbl.name}.${col.name}`;
                  return val !== o.expr ? (
                    <option key={val} value={val}>{val}</option>
                  ) : null;
                }).filter(Boolean)
              )}
            </select>
            <input
              className="w-24 rounded border border-slate-600 bg-slate-900 px-1 text-[10px] text-slate-200"
              value={o.expr}
              onChange={(e) => {
                const n: OrderKey[] = [...(model.orderBy ?? [])];
                n[i] = { ...n[i]!, expr: e.target.value };
                apply({ ...model, orderBy: n });
              }}
              placeholder="expr"
            />
            <select
              value={o.dir}
              onChange={(e) => {
                const n: OrderKey[] = [...(model.orderBy ?? [])];
                n[i] = { ...n[i]!, dir: e.target.value as "ASC" | "DESC" };
                apply({ ...model, orderBy: n });
              }}
            >
              <option value="ASC">ASC</option>
              <option value="DESC">DESC</option>
            </select>
            <select
              value={o.nulls ?? ""}
              onChange={(e) => {
                const n: OrderKey[] = [...(model.orderBy ?? [])];
                n[i] = {
                  ...n[i]!,
                  nulls: e.target.value
                    ? (e.target.value as "FIRST" | "LAST")
                    : undefined,
                };
                apply({ ...model, orderBy: n });
              }}
            >
              <option value="">NULLS</option>
              <option value="FIRST">FIRST</option>
              <option value="LAST">LAST</option>
            </select>
            <button
              type="button"
              onClick={() =>
                apply({
                  ...model,
                  orderBy: model.orderBy.filter((_, j) => j !== i),
                })
              }
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-[10px] text-sky-400"
          onClick={() =>
            apply({
              ...model,
              orderBy: [
                ...model.orderBy,
                { expr: schema.tables[0]?.columns[0]?.name ?? "1", dir: "ASC" },
              ],
            })
          }
        >
          + order
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="text-[10px] text-slate-500">LIMIT</label>
          <input
            type="number"
            className="w-20 rounded border border-slate-600"
            value={model.limit ?? ""}
            onChange={(e) =>
              apply({
                ...model,
                limit: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            min={0}
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-500">OFFSET</label>
          <input
            type="number"
            className="w-20 rounded border border-slate-600"
            value={model.offset ?? ""}
            onChange={(e) =>
              apply({
                ...model,
                offset: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            min={0}
          />
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs font-semibold text-slate-400">UNION</div>
        <button
          type="button"
          className="text-[10px] text-sky-400"
          onClick={() =>
            apply({
              ...model,
              unions: [
                ...model.unions,
                {
                  kind: "UNION" as const,
                  query: newEmptyQueryModel({ name: "union" }),
                },
              ],
            })
          }
        >
          + union branch
        </button>
        {model.unions.map((u, i) => (
          <div key={i} className="mt-1 flex items-center justify-between text-[10px]">
            <span>{u.kind}</span>
            <button
              className="text-sky-400"
              onClick={() =>
                setNested({
                  kind: "union",
                  index: i,
                  draft: u.query,
                })
              }
            >
              edit branch
            </button>
            <button
              className="text-red-400"
              onClick={() =>
                apply({
                  ...model,
                  unions: model.unions.filter((_, j) => j !== i),
                })
              }
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        <LearnLink topic="select" label="SQL reference" />
      </div>

      <div className="space-y-2 rounded border border-slate-700 bg-slate-950/50 p-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>SQL preview</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="text-sky-400 hover:underline"
              onClick={() =>
                void navigator.clipboard.writeText(sql)
              }
            >
              Copy
            </button>
            <button
              type="button"
              className="rounded bg-emerald-700/80 px-2 py-0.5 text-xs text-white hover:bg-emerald-600"
              onClick={() => runHighlight()}
            >
              Visualize in 3D
            </button>
          </div>
        </div>
        <pre className="max-h-40 overflow-auto font-mono text-[10px] text-slate-300">
          {sql}
        </pre>
      </div>

      {nested.draft && nested.kind && (
        <NestedQueryDialog
          open
          title="Nested query"
          value={nested.draft}
          onClose={() => setNested({ kind: null })}
          onSave={(q) => {
            if (nested.kind === "cte" && nested.index != null) {
              const ctes = [...(model.ctes ?? [])];
              ctes[nested.index!] = {
                ...ctes[nested.index!]!,
                query: q,
              };
              apply({ ...model, ctes });
            } else if (nested.kind === "from") {
              const al =
                model.from.kind === "subquery" ? model.from.alias : "s";
              apply({
                ...model,
                from: { kind: "subquery", query: q, alias: al },
              });
            } else if (nested.kind === "union" && nested.index != null) {
              const u = [...model.unions] as UnionArm[];
              u[nested.index!] = { ...u[nested.index!]!, query: q };
              apply({ ...model, unions: u });
            }
            setNested({ kind: null });
          }}
        />
      )}
    </div>
  );
}
