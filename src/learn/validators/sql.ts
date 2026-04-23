import { parseSqlToModel } from "@/query/parseSql";
import { normalizeQueryModel } from "@/model/query";
import type { SqlCheckSpec, ValidationItem, ValidationResult } from "../types";
import { queryShape, type QueryShape } from "./sqlShape";

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function mergeCheck(
  derived: SqlCheckSpec,
  explicit: SqlCheckSpec | null
): SqlCheckSpec {
  if (!explicit) return derived;
  return {
    must_from: explicit.must_from ?? derived.must_from,
    must_join_to: explicit.must_join_to ?? derived.must_join_to,
    must_select_columns:
      explicit.must_select_columns ?? derived.must_select_columns,
    disallow: explicit.disallow ?? derived.disallow,
    must_cte: explicit.must_cte ?? derived.must_cte,
    require_cte: explicit.require_cte ?? derived.require_cte,
    require_subquery: explicit.require_subquery ?? derived.require_subquery,
    require_group_by: explicit.require_group_by ?? derived.require_group_by,
  };
}

/** When there is no explicit `check` block, infer minimal requirements from the answer key. */
function deriveFromAnswerSql(answerSql: string): SqlCheckSpec {
  const r = parseSqlToModel(answerSql);
  if (!r.ok) return {};
  const m = normalizeQueryModel(r.model);
  const sh = queryShape(m);
  const spec: SqlCheckSpec = {};
  if (sh.fromTable) spec.must_from = sh.fromTable;
  if (sh.joinTables.length > 0) {
    spec.must_join_to =
      sh.joinTables.length === 1 ? sh.joinTables[0]! : sh.joinTables;
  }
  if (sh.selectColumns.length > 0 && !sh.hasStar) {
    spec.must_select_columns = sh.selectColumns;
  }
  if (sh.cteNames.length > 0) {
    spec.require_cte = true;
    spec.must_cte = sh.cteNames.length === 1 ? sh.cteNames[0]! : sh.cteNames;
  }
  if (sh.hasSubqueryInFrom) spec.require_subquery = true;
  if (sh.hasGroupBy) spec.require_group_by = true;
  return spec;
}

function colMatch(required: string, studentCols: string[]): boolean {
  const r = norm(required);
  const needCol = r.includes(".") ? r.split(".").pop()! : r;
  for (const sc of studentCols) {
    const s = norm(sc);
    if (s === r) return true;
    if (s.endsWith(`.${needCol}`) || s === needCol) return true;
  }
  return false;
}

function runDisallow(
  name: NonNullable<SqlCheckSpec["disallow"]>[number],
  sh: QueryShape
): { ok: boolean; detail: string } {
  switch (name) {
    case "groupBy":
      return {
        ok: !sh.hasGroupBy,
        detail: sh.hasGroupBy ? "Remove GROUP BY" : "No GROUP BY (as required)",
      };
    case "having":
      return {
        ok: !sh.hasHaving,
        detail: sh.hasHaving ? "Remove HAVING" : "No HAVING (as required)",
      };
    case "distinct":
      return {
        ok: !sh.hasDistinct,
        detail: sh.hasDistinct ? "Remove DISTINCT" : "No DISTINCT (as required)",
      };
    case "limit":
      return {
        ok: !sh.hasLimit,
        detail: sh.hasLimit ? "Remove LIMIT" : "No LIMIT (as required)",
      };
    case "cte": {
      const hasCte = sh.cteNames.length > 0;
      return {
        ok: !hasCte,
        detail: hasCte ? "Remove WITH/CTE" : "No CTE (as required)",
      };
    }
    case "union":
      return {
        ok: !sh.hasUnion,
        detail: sh.hasUnion ? "Remove UNION" : "No UNION (as required)",
      };
    case "subqueryInFrom":
      return {
        ok: !sh.hasSubqueryInFrom,
        detail: sh.hasSubqueryInFrom
          ? "Simplify FROM (no subquery in FROM)"
          : "No subquery in FROM (as required)",
      };
  }
}

export function validateSqlLesson(
  userSql: string,
  answerSql: string,
  explicitCheck: SqlCheckSpec | null
): ValidationResult {
  const items: ValidationItem[] = [];
  const derived = deriveFromAnswerSql(answerSql);
  const spec = mergeCheck(derived, explicitCheck);
  const parseUser = parseSqlToModel(userSql);
  if (!parseUser.ok) {
    return {
      pass: false,
      items: [
        {
          label: "Parse",
          ok: false,
          detail: parseUser.reason,
        },
      ],
    };
  }
  const userModel = normalizeQueryModel(parseUser.model);
  const sh = queryShape(userModel);

  if (spec.must_from) {
    const need = norm(spec.must_from);
    const got = sh.fromTable ? norm(sh.fromTable) : "";
    const ok = got === need;
    items.push({
      label: "FROM table",
      ok,
      detail: ok
        ? `FROM ${spec.must_from}`
        : `Expected FROM ${spec.must_from}, got ${sh.fromTable ?? "(none)"}`,
    });
  }

  if (spec.must_join_to) {
    const need = Array.isArray(spec.must_join_to)
      ? spec.must_join_to.map(norm)
      : [norm(spec.must_join_to)];
    const have = new Set([...sh.joinTables.map(norm)]);
    const ok = need.every((n) => have.has(n));
    items.push({
      label: "JOIN target(s)",
      ok,
      detail: ok
        ? `Joins: ${need.join(", ")}`
        : `Missing join to: ${need.filter((n) => !have.has(n)).join(", ")}`,
    });
  }

  if (spec.must_select_columns?.length) {
    for (const col of spec.must_select_columns) {
      const ok = sh.hasStar || colMatch(col, sh.selectColumns);
      items.push({
        label: `SELECT includes ${col}`,
        ok,
        detail: ok
          ? "Column present in SELECT (or *)"
          : "Add this column to SELECT (or use table.* if allowed)",
      });
    }
  }

  if (spec.disallow?.length) {
    for (const d of spec.disallow) {
      const r = runDisallow(d, sh);
      items.push({
        label: `Not: ${d}`,
        ok: r.ok,
        detail: r.detail,
      });
    }
  }

  if (spec.require_cte) {
    const ok = sh.cteNames.length > 0;
    items.push({
      label: "WITH / CTE",
      ok,
      detail: ok ? `CTEs: ${sh.cteNames.join(", ")}` : "Add a WITH (CTE) clause",
    });
  }

  if (spec.must_cte) {
    const names = Array.isArray(spec.must_cte) ? spec.must_cte : [spec.must_cte];
    const have = new Set(sh.cteNames.map(norm));
    for (const n of names) {
      const ok = have.has(norm(n));
      items.push({
        label: `CTE "${n}"`,
        ok,
        detail: ok ? "Defined" : "Define this CTE name",
      });
    }
  }

  if (spec.require_subquery) {
    items.push({
      label: "Subquery in FROM",
      ok: sh.hasSubqueryInFrom,
      detail: sh.hasSubqueryInFrom
        ? "Found"
        : "Use a subquery in the FROM clause",
    });
  }

  if (spec.require_group_by) {
    items.push({
      label: "GROUP BY",
      ok: sh.hasGroupBy,
      detail: sh.hasGroupBy
        ? "Present"
        : "Add GROUP BY to match the exercise",
    });
  }

  const pass = items.every((i) => i.ok);
  if (items.length === 0) {
    return {
      pass: true,
      items: [
        {
          label: "Structure",
          ok: true,
          detail: "No automated checks; answer key is for your reference",
        },
      ],
    };
  }
  return { pass, items };
}
