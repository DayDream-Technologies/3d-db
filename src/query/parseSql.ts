import { Parser } from "node-sql-parser";
import type { Binary, From, Column, OrderBy, Limit, With, AggrFunc, Join } from "node-sql-parser";
import {
  newQueryId,
  newEmptyQueryModel,
  type CteDef,
  type FromSource,
  type JoinItem,
  type OrderKey,
  type QueryModel,
  type SelectItem,
  type ValExpr,
  type WhereItem,
  type UnionArm,
  type WhereOp,
} from "@/model/query";

export type ParseSqlResult =
  | { ok: true; model: QueryModel }
  | { ok: false; reason: string };

/* eslint-disable @typescript-eslint/no-explicit-any -- node-sql-parser AST is loosely typed */

const sqlParser = new Parser();

function toValExpr(n: any): ValExpr {
  const p = sqlParser;
  if (!n || typeof n !== "object") {
    return { k: "raw", sql: "?" };
  }
  if (n.type === "column_ref") {
    const col =
      typeof n.column === "string" ? n.column : String(n.column?.expr?.value ?? "?");
    const t = n.table;
    if (t && typeof t === "string") {
      return { k: "col", table: t, column: col };
    }
    return { k: "col", column: col };
  }
  if (n.type === "aggr_func") {
    return { k: "raw", sql: "" }; // caller handles aggr
  }
  if (n.type === "string" || n.type === "single_quote_string" || n.type === "double_quote_string") {
    return { k: "str", v: String(n.value) };
  }
  if (typeof n.value === "number" || n.type === "number") {
    return { k: "num", v: Number(n.value) };
  }
  if (n.type === "star" || n.type === "STAR") {
    return { k: "col", column: "*" };
  }
  if (n.type === "select") {
    try {
      const s = p.sqlify(n, { database: "postgresql" });
      return { k: "raw", sql: `(${s})` };
    } catch {
      return { k: "raw", sql: "(SELECT 1)" };
    }
  }
  return { k: "ref", text: "?" };
}

function fromSelectToModel(s: any): QueryModel | null {
  if (!s || s.type !== "select") return null;
  if (s._next) {
    const a = { ...s };
    delete a._next;
    delete a.set_op;
    const l = toCoreModel(a);
    if (!l) return null;
    const op = (s.set_op || "UNION") as "UNION" | "UNION ALL";
    const r = fromSelectToModel(s._next);
    if (!r) return l;
    return { ...l, unions: [{ kind: op, query: r }] as UnionArm[] };
  }
  return toCoreModel(s);
}

function toCoreModel(s: any): QueryModel | null {
  if (!s || s.type !== "select") return null;
  const m = newEmptyQueryModel({ name: "Parsed query" });
  m.id = newQueryId();
  m.notes = "";
  m.updatedAt = new Date().toISOString();

  if (s.distinct === "DISTINCT") m.distinct = true;

  if (s.with && Array.isArray(s.with) && s.with.length > 0) {
    m.ctes = (s.with as With[]).map((w) => {
      const wn = w.name;
      const name = typeof wn === "string" ? wn : (wn as { value: string }).value;
      const inner = w.stmt?.ast;
      return {
        name,
        query: (inner ? fromSelectToModel(inner) : newEmptyQueryModel()) ?? newEmptyQueryModel(),
      } as CteDef;
    });
  }

  // columns
  m.select = [];
  const cols = s.columns;
  if (Array.isArray(cols)) {
    for (const col of cols) {
      const c = toSelectItem(col as any);
      if (c) m.select.push(c);
    }
  }
  if (m.select.length === 0) m.select.push({ k: "col", column: "id" });

  // from: array of BaseFrom | Join | subquery, or a single table expr
  const rawFrom = s.from;
  const fromArr: any[] = Array.isArray(rawFrom)
    ? rawFrom
    : rawFrom
      ? [rawFrom as From]
      : [];
  if (fromArr.length === 0) {
    m.from = { kind: "table", name: "t", alias: "t" };
  } else {
    const f0 = fromArr[0] as any;
    m.from = fromToSource(f0) ?? m.from;
    m.joins = [] as JoinItem[];
    for (let i = 1; i < fromArr.length; i++) {
      const fi = fromArr[i] as any;
      if (fi?.join) {
        const j = toJoin(fi);
        if (j) m.joins.push(j);
      }
    }
  }

  if (s.where) m.where = binaryToWhere(s.where) ?? undefined;

  if (s.groupby?.columns && Array.isArray(s.groupby.columns)) {
    m.groupBy = s.groupby.columns.map((g: any) => {
      if (g.type === "column_ref") {
        const t = g.table;
        const col = typeof g.column === "string" ? g.column : "?";
        return t ? `${t}.${col}` : col;
      }
      return "?";
    });
  } else m.groupBy = [];

  if (s.having) {
    m.having = arrayHaving(s.having);
  }

  if (Array.isArray(s.orderby) && s.orderby.length) {
    m.orderBy = (s.orderby as OrderBy[]).map((o) => toOrderKey(o, o.expr));
  } else m.orderBy = [];

  if (s.limit) m.limit = limitToNum(s.limit, 0) ?? undefined;
  if (s.offset || (s.limit as any)?.offset) {
    m.offset =
      (s as any).offset != null
        ? Number((s as any).offset)
        : limitToNum(s.limit, 1);
  }
  m.unions = [];
  m.updatedAt = new Date().toISOString();
  return m;
}

// Fix invalid fields on newEmptyQueryModel
function fixModelFields(m: QueryModel): void {
  if ((m as { selectedAt?: string }).selectedAt) {
    delete (m as { selectedAt?: string }).selectedAt;
  }
}

function toSelectItem(col: Column & { expr?: any; as?: any }): SelectItem | null {
  const e = (col as any).expr ?? col;
  if (!e) return null;
  if (e.type === "aggr_func") {
    const af = e as AggrFunc;
    const rawName = (af as any).name;
    const name =
      (Array.isArray(rawName?.name)
        ? (rawName.name[0] as { value?: string })?.value
        : (rawName as { value?: string })?.value) ?? "COUNT";
    const nameU = String(name).toUpperCase();
    const fn0 = (["COUNT", "SUM", "AVG", "MIN", "MAX"].includes(nameU) ? nameU : "COUNT") as
      | "COUNT"
      | "SUM"
      | "AVG"
      | "MIN"
      | "MAX";
    const d = af.args?.distinct;
    const arg0 = af.args?.expr;
    if (nameU === "COUNT" && (arg0 as { type?: string } | undefined)?.type === "star") {
      return { k: "agg", fn: "COUNT", arg: { k: "col", column: "*" } };
    }
    return {
      k: "agg",
      fn: fn0,
      distinctArg: d === "DISTINCT",
      arg: toValExpr(arg0 as { type: string } | any),
      alias: colAsString(col as { as?: { value: string } | string | null }) || undefined,
    };
  }
  if (e.type === "star") {
    return { k: "star", table: (e as { table?: string }).table, alias: colAsString(col) || undefined };
  }
  if (e.type === "column_ref" || (col as any).type === "column_ref") {
    const cr = (e as any).type ? e : (col as any);
    return {
      k: "col",
      table: cr.table ?? undefined,
      column: typeof cr.column === "string" ? cr.column : String(cr.column),
      alias: colAsString(col as any) || undefined,
    };
  }
  return { k: "raw", sql: "?", alias: colAsString(col) || undefined };
}

function colAsString(c: { as?: { value: string } | string | null } | null | undefined): string | undefined {
  if (!c?.as) return undefined;
  if (typeof c.as === "string") return c.as;
  if (typeof (c as any).as?.value === "string") return (c as any).as.value;
  if ((c as any).as?.value) return String((c as any).as.value);
  return undefined;
}

function fromToSource(f: any): FromSource | null {
  if (f.type === "dual" || f.table === "dual" && f.type) return { kind: "table", name: "dual" };
  if (f.table && f.expr) {
    const m = f.expr?.ast && fromSelectToModel(f.expr.ast);
    if (m && f.as) return { kind: "subquery", query: m, alias: String(f.as) };
  }
  if (f.table) {
    return { kind: "table", name: f.table, alias: f.as ?? undefined };
  }
  return { kind: "table", name: "t" };
}

function toJoin(f: From): JoinItem | null {
  const j = f as Join;
  const kind = mapJoinStr(j.join);
  const on = (j as { on?: Binary }).on;
  if (!(f as { table?: string }).table) return null;
  const ft = f as { table: string; as?: string | null };
  return {
    kind,
    from: { kind: "table", name: ft.table, alias: ft.as ?? undefined },
    on: on
      ? { t: "group", op: "AND" as const, children: [binaryToWhere(on)!].filter(Boolean) as WhereItem[] }
      : { t: "group", op: "AND" as const, children: [] },
  };
}

function mapJoinStr(s: string | undefined): JoinItem["kind"] {
  if (!s) return "INNER";
  if (s.includes("LEFT")) return "LEFT";
  if (s.includes("RIGHT")) return "RIGHT";
  if (s.includes("FULL") || s.includes("OUTER")) return "FULL";
  return "INNER";
}

function binaryToWhere(b: Binary | null | undefined): WhereItem | null {
  if (!b) return null;
  if (b.type === "binary_expr" && b.operator) {
    const op = b.operator.toUpperCase();
    if (op === "AND" || op === "OR") {
      const leftW = binaryToWhere(b.left as any);
      const rightW = binaryToWhere(b.right as any);
      if (!leftW) return rightW;
      if (!rightW) return leftW;
      if (rightW.t === "group" && (rightW as any).op === op) {
        return {
          t: "group",
          op: op as "AND" | "OR",
          children: [leftW, ...(rightW as any).children],
        } as WhereItem;
      }
      if (leftW.t === "group" && (leftW as any).op === op) {
        return {
          t: "group",
          op: op as "AND" | "OR",
          children: [...(leftW as any).children, rightW],
        } as WhereItem;
      }
      return { t: "group", op: op as "AND" | "OR", children: [leftW, rightW] };
    }
    const wop = mapOp(b.operator, b);
    if (!wop) {
      return { t: "cond" as any, op: "=", left: toValExpr(b.left), right: toValExpr(b.right) } as any;
    }
    if (wop === "BETWEEN" || wop === "NOT BETWEEN") {
      const rArr = b.right as any;
      const lo = rArr?.value?.[0] ?? rArr?.left ?? rArr;
      const hi = rArr?.value?.[1] ?? rArr?.right;
      return {
        t: "cond",
        op: wop,
        left: toValExpr(b.left as any),
        right: toValExpr(lo),
        betweenEnd: hi ? toValExpr(hi) : { k: "str" as const, v: "" },
      } as WhereItem;
    }
    return {
      t: "cond",
      op: wop as any,
      left: toValExpr(b.left as any),
      right:
        wop === "IN" || wop === "NOT IN"
          ? undefined
          : wop === "IS NULL" || wop === "IS NOT NULL"
            ? undefined
            : toValExpr(b.right as any),
      inList: wop === "IN" || wop === "NOT IN" ? exprListToString(b.right) : undefined,
    } as WhereItem;
  }
  return { t: "cond", op: "=", left: toValExpr(b as any), right: { k: "str", v: "?" } } as any;
}

function mapOp(o: string, b: Binary): WhereOp | null {
  const u = o.toLowerCase();
  if (u === "and" || u === "or") return null;
  if (u === "=") return "=";
  if (u === "!=" || u === "<>") return "!=";
  if (u === ">" || u === "<" || u === "<=" || u === ">=") {
    return o as any;
  }
  if (u === "in") return "IN";
  if (u === "not in" || o === "NOT IN") return "NOT IN";
  if (u === "like") return "LIKE";
  if (u === "not like" || o === "NOT LIKE") return "NOT LIKE";
  if (u === "between") return "BETWEEN";
  if (u === "not between" || o === "NOT BETWEEN") return "NOT BETWEEN";
  if (u === "is") {
    const r = b.right as any;
    if (r?.value === "null" || r?.type === "null") return "IS NULL";
  }
  if (u === "is not") {
    const r = b.right as any;
    if (r?.value === "null" || r?.type === "null") return "IS NOT NULL";
  }
  return null;
}

function exprListToString(n: any): string[] {
  if (!n) return [];
  if (n.type === "expr_list" && Array.isArray(n.value)) {
    return n.value.map((v: any) => {
      if (v.value != null) return String(v.value);
      return "''";
    });
  }
  return [String(n)];
}

function arrayHaving(h: any): WhereItem | undefined {
  if (Array.isArray(h) && h[0] && h[0].type === "binary_expr") {
    return binaryToWhere(h[0] as Binary) ?? undefined;
  }
  if (h && typeof h === "object" && h.type) return binaryToWhere(h as any) ?? undefined;
  return undefined;
}

function toOrderKey(
  o: OrderBy,
  ex: any
): OrderKey {
  let expr = "";
  if (ex?.type === "column_ref") {
    const t = ex.table;
    const c = ex.column;
    const cs = typeof c === "string" ? c : "?";
    expr = t ? `${t}.${cs}` : cs;
  } else {
    expr = "1";
  }
  const d = String(o.type ?? "ASC");
  return {
    expr,
    dir: d.toUpperCase() === "DESC" ? "DESC" : "ASC",
  };
}

function limitToNum(l: Limit, idx: number): number | undefined {
  if (!l?.value?.[idx]) return undefined;
  const v = l.value[idx];
  return typeof v.value === "number" ? v.value : Number((v as any).value);
}

/**
 * Public: parse a SELECT string to QueryModel. Best-effort; use with UI fallback.
 */
export function parseSqlToModel(sql: string): ParseSqlResult {
  const trimmed = sql.trim();
  if (!trimmed) {
    return { ok: false, reason: "Empty input" };
  }
  try {
    const parser = new Parser();
    const ast = parser.astify(trimmed, { database: "postgresql" });
    const st = (Array.isArray(ast) ? ast[0] : ast) as any;
    if (!st || st.type !== "select") {
      return { ok: false, reason: "Expected a single SELECT" };
    }
    const m = fromSelectToModel(st);
    if (!m) return { ok: false, reason: "Could not convert to query model" };
    fixModelFields(m);
    return { ok: true, model: m };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
