import { Parser } from "node-sql-parser";
import type { Schema } from "@/model/schema";

export type QueryHighlightResult = {
  ok: boolean;
  error?: string;
  tables: string[];
  joins: { left: string; right: string }[];
};

type FromItem = {
  db?: string | null;
  table?: string;
  as?: string | null;
  join?: string;
  on?: unknown;
  /** For subqueries / UNIONs */
  expr?: unknown;
};

function collectColumnRefTables(node: unknown, out: Set<string>): void {
  if (!node || typeof node !== "object") return;
  const n = node as {
    type?: string;
    table?: string | null;
    left?: unknown;
    right?: unknown;
    args?: unknown;
    expr?: unknown;
    value?: unknown;
  };
  if (n.type === "column_ref" && typeof n.table === "string" && n.table) {
    out.add(n.table);
  }
  for (const key of ["left", "right", "expr", "args", "value"] as const) {
    const v = n[key];
    if (Array.isArray(v)) for (const x of v) collectColumnRefTables(x, out);
    else if (v && typeof v === "object") collectColumnRefTables(v, out);
  }
}

function walkSelect(
  stmt: unknown,
  knownTables: Set<string>,
  out: {
    tables: Set<string>;
    joins: Set<string>;
  }
): void {
  if (!stmt || typeof stmt !== "object") return;
  const s = stmt as {
    type?: string;
    from?: FromItem[] | null;
    with?: Array<{ stmt?: unknown }> | null;
    _next?: unknown;
    ast?: unknown;
  };
  if (s.with && Array.isArray(s.with)) {
    for (const cte of s.with) {
      walkSelect(cte.stmt, knownTables, out);
    }
  }
  if (!Array.isArray(s.from)) return;

  // alias -> real table
  const alias = new Map<string, string>();
  const fromTables: string[] = [];

  for (const item of s.from) {
    if (item?.table && knownTables.has(item.table)) {
      fromTables.push(item.table);
      out.tables.add(item.table);
      if (item.as) alias.set(item.as, item.table);
      alias.set(item.table, item.table);
    }
    // Subqueries
    const inner = (item as { expr?: { ast?: unknown } }).expr?.ast;
    if (inner) walkSelect(inner, knownTables, out);
  }

  // Joins: each FROM entry after the first with a `join` belongs to the chain.
  // Use ON clause column_refs to pair the new table with the first ON-side table.
  let prevLineage = fromTables[0];
  for (let i = 1; i < s.from.length; i++) {
    const item = s.from[i];
    if (!item?.join) continue;
    const right =
      item.table && knownTables.has(item.table) ? item.table : undefined;
    if (!right) {
      prevLineage = right ?? prevLineage;
      continue;
    }
    const onTables = new Set<string>();
    collectColumnRefTables(item.on, onTables);
    const resolvedOn = new Set<string>();
    for (const t of onTables) {
      const real = alias.get(t);
      if (real && knownTables.has(real)) resolvedOn.add(real);
    }
    // Prefer explicit left ON side that isn't the right table itself.
    let left: string | undefined;
    for (const t of resolvedOn) {
      if (t !== right) {
        left = t;
        break;
      }
    }
    if (!left) left = prevLineage;
    if (left && left !== right) {
      const a = left < right ? left : right;
      const b = left < right ? right : left;
      out.joins.add(`${a}|${b}`);
    }
    prevLineage = right;
  }
}

export function parseSelectQuery(
  sql: string,
  schema: Schema
): QueryHighlightResult {
  const trimmed = sql.trim();
  if (!trimmed) {
    return { ok: false, error: "Empty query", tables: [], joins: [] };
  }
  const knownTables = new Set(schema.tables.map((t) => t.name));

  try {
    const parser = new Parser();
    const astRaw = parser.astify(trimmed, { database: "postgresql" });
    const statements = Array.isArray(astRaw) ? astRaw : [astRaw];

    const acc = { tables: new Set<string>(), joins: new Set<string>() };

    let sawSelect = false;
    for (const stmt of statements) {
      if (!stmt || typeof stmt !== "object") continue;
      const t = (stmt as { type?: string }).type;
      if (t === "select") {
        sawSelect = true;
        walkSelect(stmt, knownTables, acc);
      }
    }

    if (!sawSelect) {
      return {
        ok: false,
        error: "Only SELECT queries are supported for highlight",
        tables: [],
        joins: [],
      };
    }

    const joins = [...acc.joins].map((k) => {
      const [left, right] = k.split("|");
      return { left, right };
    });

    return {
      ok: true,
      tables: [...acc.tables],
      joins,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg, tables: [], joins: [] };
  }
}
