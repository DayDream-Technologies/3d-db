import type { QueryModel, SelectItem, FromSource, JoinItem } from "@/model/query";

export type QueryShape = {
  fromTable: string | null;
  joinTables: string[];
  selectColumns: string[];
  hasStar: boolean;
  hasGroupBy: boolean;
  hasHaving: boolean;
  hasDistinct: boolean;
  hasLimit: boolean;
  cteNames: string[];
  hasUnion: boolean;
  hasSubqueryInFrom: boolean;
  hasAggregate: boolean;
};

function fromTableName(f: FromSource): string | null {
  if (f.kind === "subquery") return null;
  return f.name;
}

function joinTableNames(joins: JoinItem[]): string[] {
  const out: string[] = [];
  for (const j of joins) {
    if (j.from.kind === "table") out.push(j.from.name);
  }
  return out;
}

function selectParts(items: SelectItem[]): {
  cols: string[];
  hasStar: boolean;
  hasAgg: boolean;
} {
  const cols: string[] = [];
  let hasStar = false;
  let hasAgg = false;
  for (const s of items) {
    if (s.k === "star") {
      hasStar = true;
    } else if (s.k === "col") {
      const t = s.table;
      const c = s.column;
      cols.push(t ? `${t}.${c}` : c);
    } else if (s.k === "agg") {
      hasAgg = true;
    } else if (s.k === "raw") {
      hasAgg = true; // could be expression
    }
  }
  return { cols, hasStar, hasAgg: hasAgg };
}

/**
 * Build a loose structural view of a QueryModel for lesson checks.
 */
export function queryShape(m: QueryModel): QueryShape {
  const fromTable = fromTableName(m.from);
  const joinTables = joinTableNames(m.joins);
  const { cols, hasStar, hasAgg: selectAgg } = selectParts(m.select);
  let hasAgg = selectAgg;
  for (const s of m.select) {
    if (s.k === "agg") hasAgg = true;
  }
  return {
    fromTable,
    joinTables,
    selectColumns: cols,
    hasStar,
    hasGroupBy: m.groupBy.length > 0,
    hasHaving: m.having !== undefined,
    hasDistinct: m.distinct,
    hasLimit: m.limit !== undefined,
    cteNames: m.ctes.map((c) => c.name),
    hasUnion: m.unions.length > 0,
    hasSubqueryInFrom: m.from.kind === "subquery",
    hasAggregate: hasAgg || m.groupBy.length > 0,
  };
}
