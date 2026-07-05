/**
 * Query Builder intermediate representation.
 * Maps to PostgreSQL-style SELECT (compatible with the app's query highlighter).
 */

export type OrderDirection = "ASC" | "DESC";
export type OrderNulls = "FIRST" | "LAST";

export type JoinKind = "INNER" | "LEFT" | "RIGHT" | "FULL";

export type WhereOp =
  | "="
  | "!="
  | "<"
  | "<="
  | ">"
  | ">="
  | "LIKE"
  | "NOT LIKE"
  | "IN"
  | "NOT IN"
  | "IS NULL"
  | "IS NOT NULL"
  | "BETWEEN"
  | "NOT BETWEEN";

/** Unqualified or qualified column ref as string, or raw for expressions */
export type ValExpr =
  | { k: "col"; table?: string; column: string }
  | { k: "ref"; text: string }
  | { k: "str"; v: string }
  | { k: "num"; v: number }
  | { k: "raw"; sql: string };

export type WhereItem =
  | { t: "group"; op: "AND" | "OR"; children: WhereItem[] }
  | { t: "cond"; op: WhereOp; left: ValExpr; right?: ValExpr; inList?: string[]; betweenEnd?: ValExpr };

export type AggFn = "COUNT" | "SUM" | "AVG" | "MIN" | "MAX";

export type SelectItem =
  | { k: "star"; table?: string; alias?: string }
  | { k: "col"; table?: string; column: string; alias?: string }
  | {
      k: "agg";
      fn: AggFn;
      distinctArg?: boolean;
      arg: ValExpr;
      alias?: string;
    }
  | { k: "raw"; sql: string; alias?: string };

export type FromSource =
  | { kind: "table"; name: string; alias?: string }
  | { kind: "subquery"; query: QueryModel; alias: string };

export type JoinOn = { t: "group"; op: "AND" | "OR"; children: WhereItem[] };

export type JoinItem = {
  kind: JoinKind;
  from: FromSource; // only table in practice, but subquery in JOIN is allowed
  on?: JoinOn;
};

export type OrderKey = {
  expr: string; // e.g. "a.col" or "1"
  dir: OrderDirection;
  nulls?: OrderNulls;
};

export type CteDef = { name: string; query: QueryModel };

export type UnionArm = { kind: "UNION" | "UNION ALL"; query: QueryModel };

export type QueryModel = {
  id: string;
  name: string;
  notes: string;
  updatedAt: string;
  distinct: boolean;
  ctes: CteDef[];
  select: SelectItem[];
  from: FromSource;
  joins: JoinItem[];
  where?: WhereItem;
  groupBy: string[]; // expressions as strings, e.g. u.id
  having?: WhereItem;
  orderBy: OrderKey[];
  limit?: number;
  offset?: number;
  unions: UnionArm[];
};

export function newQueryId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function newEmptyQueryModel(over?: Partial<Pick<QueryModel, "name">>): QueryModel {
  const now = new Date().toISOString();
  return {
    id: newQueryId(),
    name: over?.name ?? "New query",
    notes: "",
    updatedAt: now,
    distinct: false,
    ctes: [],
    select: [
      { k: "col", table: undefined, column: "id", alias: undefined },
    ],
    from: { kind: "table", name: "users", alias: "u" },
    joins: [],
    where: undefined,
    groupBy: [],
    having: undefined,
    orderBy: [],
    limit: undefined,
    offset: undefined,
    unions: [],
  };
}

/** Shallow copy with new id and name */
export function cloneQueryModel(q: QueryModel, name: string): QueryModel {
  const s = JSON.stringify(q) as string;
  const p = JSON.parse(s) as QueryModel;
  p.id = newQueryId();
  p.name = name;
  p.updatedAt = new Date().toISOString();
  return p;
}

/** Fills missing arrays from older exports / localStorage. */
export function normalizeQueryModel(m: QueryModel): QueryModel {
  return {
    ...m,
    ctes: m.ctes ?? [],
    joins: m.joins ?? [],
    unions: m.unions ?? [],
    groupBy: m.groupBy ?? [],
    orderBy: m.orderBy ?? [],
    select:
      m.select && m.select.length > 0
        ? m.select
        : ([{ k: "col", column: "id" }] as SelectItem[]),
  };
}
