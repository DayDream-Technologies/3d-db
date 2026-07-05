import type {
  FromSource,
  JoinItem,
  OrderKey,
  QueryModel,
  SelectItem,
  ValExpr,
  WhereItem,
} from "@/model/query";

function qIdent(s: string): string {
  if (/^[a-zA-Z_][\w$]*$/.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

function emitVal(v: ValExpr): string {
  switch (v.k) {
    case "col": {
      if (v.table) return `${qIdent(v.table)}.${qIdent(v.column)}`;
      return qIdent(v.column);
    }
    case "ref":
      return v.text;
    case "str":
      return `'${v.v.replace(/'/g, "''")}'`;
    case "num":
      return String(v.v);
    case "raw":
      return v.sql;
    default:
      return "?";
  }
}

function emitSelectItem(s: SelectItem): string {
  switch (s.k) {
    case "star":
      return s.table ? `${qIdent(s.table)}.*` : "*";
    case "col": {
      const e =
        s.table && s.column
          ? `${qIdent(s.table)}.${qIdent(s.column)}`
          : qIdent(s.column);
      return s.alias ? `${e} AS ${qIdent(s.alias)}` : e;
    }
    case "agg": {
      let argSql: string;
      if (s.arg.k === "raw") argSql = s.arg.sql;
      else if (
        s.fn === "COUNT" &&
        s.arg.k === "col" &&
        s.arg.column === "*" &&
        !s.arg.table
      ) {
        argSql = "*";
      } else {
        argSql = emitVal(s.arg);
      }
      let inside = argSql;
      if (s.distinctArg) {
        if (s.fn === "COUNT" && argSql === "*") {
          inside = "*";
        } else {
          inside = "DISTINCT " + argSql;
        }
      }
      const fnCall = `${s.fn}(${inside})`;
      return s.alias ? `${fnCall} AS ${qIdent(s.alias)}` : fnCall;
    }
    case "raw":
      return s.alias ? `${s.sql} AS ${qIdent(s.alias)}` : s.sql;
    default:
      return "?";
  }
}

function emitWhereItem(w: WhereItem, paren: boolean): string {
  if (w.t === "group") {
    if (w.children.length === 0) return paren ? "( TRUE )" : "TRUE";
    const inner = w.children
      .map((c) => emitWhereItem(c, true))
      .join(` ${w.op} `);
    return w.children.length > 1 || paren ? `( ${inner} )` : inner;
  }
  const l = emitVal(w.left);
  if (w.op === "IS NULL" || w.op === "IS NOT NULL") return `${l} ${w.op}`;
  if (w.op === "IN" || w.op === "NOT IN") {
    const list = (w.inList ?? [])
      .map((s) => `'${String(s).replace(/'/g, "''")}'`)
      .join(", ");
    return `${l} ${w.op} ( ${list} )`;
  }
  if (w.op === "BETWEEN" || w.op === "NOT BETWEEN") {
    const lo = w.right ? emitVal(w.right) : "?";
    const hi = w.betweenEnd ? emitVal(w.betweenEnd) : "?";
    return `${l} ${w.op} ${lo} AND ${hi}`;
  }
  if (w.right == null) return l;
  return `${l} ${w.op} ${emitVal(w.right)}`;
}

function emitFrom(f: FromSource, gen: (q: QueryModel) => string): string {
  if (f.kind === "table") {
    return f.alias
      ? `${qIdent(f.name)} AS ${qIdent(f.alias)}`
      : qIdent(f.name);
  }
  return `(${gen(f.query)}) AS ${qIdent(f.alias)}`;
}

const kindSql: Record<JoinItem["kind"], string> = {
  INNER: "INNER JOIN",
  LEFT: "LEFT JOIN",
  RIGHT: "RIGHT JOIN",
  FULL: "FULL OUTER JOIN",
};

function emitJoins(
  joins: JoinItem[],
  gen: (q: QueryModel) => string
): string {
  const out: string[] = [];
  for (const j of joins) {
    out.push(`${kindSql[j.kind]} ${emitFrom(j.from, gen)}`);
    if (j.on && j.on.children.length > 0) {
      const w: WhereItem = { t: "group", op: j.on.op, children: j.on.children };
      out.push(`ON ${emitWhereItem(w, false)}`);
    }
  }
  return out.length ? " " + out.join(" ") : "";
}

function emitOrderKey(o: OrderKey): string {
  let s = o.expr;
  s += " " + o.dir;
  if (o.nulls === "FIRST") s += " NULLS FIRST";
  else if (o.nulls === "LAST") s += " NULLS LAST";
  return s;
}

/** One SELECT: no top-level WITH, no UNION. Subqueries in FROM use gen(). */
function emitSingleSelect(
  q: QueryModel,
  gen: (q: QueryModel) => string
): string {
  const head: string[] = ["SELECT"];
  if (q.distinct) head.push("DISTINCT");
  if (!q.select.length) head.push("*");
  else head.push(q.select.map(emitSelectItem).join(", "));

  const b: string[] = [head.join(" ")];
  b.push("FROM " + emitFrom(q.from, gen) + emitJoins(q.joins, gen));
  if (q.where) b.push("WHERE " + emitWhereItem(q.where, false));
  if (q.groupBy.length) b.push("GROUP BY " + q.groupBy.join(", "));
  if (q.having) b.push("HAVING " + emitWhereItem(q.having, false));
  if (q.orderBy.length) b.push("ORDER BY " + q.orderBy.map(emitOrderKey).join(", "));
  if (q.limit != null) b.push(`LIMIT ${q.limit}`);
  if (q.offset != null) b.push(`OFFSET ${q.offset}`);

  return b.join(" ");
}

/**
 * Full query string for one branch (WITH, single SELECT, no UNION on this object).
 * Used recursively for CTEs and subqueries in FROM.
 */
function queryWithoutUnion(q: QueryModel): string {
  const g = (inner: QueryModel) => generateSql(inner);
  if (q.ctes && q.ctes.length > 0) {
    const cteStrs = q.ctes.map(
      (c) => `${qIdent(c.name)} AS ( ${g(c.query)} )`
    );
    const bodyQ: QueryModel = { ...q, ctes: [] };
    return "WITH " + cteStrs.join(", ") + " " + emitSingleSelect(bodyQ, g);
  }
  return emitSingleSelect(q, g);
}

/**
 * Produces a single top-level SQL string: WITH, SELECT, and UNION chain.
 */
export function generateSql(q: QueryModel): string {
  const u = q.unions;
  if (!u || u.length === 0) {
    return queryWithoutUnion({ ...q, unions: [] });
  }
  const first = queryWithoutUnion({ ...q, unions: [] });
  return u.reduce((acc, arm) => `${acc} ${arm.kind} ${generateSql(arm.query)}`, first);
}
