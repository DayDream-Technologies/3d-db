/** One Practice lesson, parsed from public/learn/lessons.md */
export type LessonTrack = "sql" | "schema";

export type LessonMeta = {
  id: string;
  track: LessonTrack;
  /** e.g. `ecommerce.json` under public/samples/ */
  sample: string;
};

export type Step = {
  id: string;
  /** 1-based step index within the lesson */
  number: number;
  title: string;
  /** Markdown for the step prompt (excludes fenced code blocks) */
  promptMd: string;
  starterSql: string;
  answerSql: string;
  /** Optional narrative / checklist for schema lessons (```text answer) */
  answerText: string;
  /** If empty, SQL lessons derive checks from the answer; schema lessons must define checks */
  check: SqlCheckSpec | SchemaCheckSpec | null;
  checkKind: "sql" | "schema";
};

export type Lesson = {
  id: string;
  title: string;
  meta: LessonMeta;
  steps: Step[];
};

/** Per-assertion row for the Practice UI */
export type ValidationItem = {
  label: string;
  ok: boolean;
  detail: string;
};

export type ValidationResult = {
  pass: boolean;
  items: ValidationItem[];
};

/**
 * YAML/JSON `check` block for SQL steps (structural; see lessons.md)
 */
export type SqlCheckSpec = {
  must_from?: string;
  /** Table name(s) that must appear in JOIN chain (any order) */
  must_join_to?: string | string[];
  /** Qualified "table.col" or bare "col" in SELECT (best-effort) */
  must_select_columns?: string[];
  disallow?: Array<
    | "groupBy"
    | "having"
    | "distinct"
    | "limit"
    | "cte"
    | "union"
    | "subqueryInFrom"
  >;
  /** CTE name must exist (after lowercase normalize) */
  must_cte?: string | string[];
  /** If true, query must have at least one CTE / WITH */
  require_cte?: boolean;
  /** If true, FROM or JOIN must be a subquery (best-effort) */
  require_subquery?: boolean;
  /** If true, query must use GROUP BY */
  require_group_by?: boolean;
};

/**
 * `check` block for schema design steps
 */
export type ColumnExpect = {
  name: string;
  primaryKey?: boolean;
  notNull?: boolean;
  /** substring match, case-insensitive */
  type_like?: string;
  indexed?: boolean;
  foreignKey?: { table: string; column: string };
};

export type RelExpect = {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
};

export type SchemaCheckSpec = {
  table_must_exist?: string[];
  columns_by_table?: Record<string, ColumnExpect[]>;
  relationships_must_include?: RelExpect[];
  /** If set, this many tables must exist in addition to (or including) the listed ones */
  min_table_count?: number;
};

export function asSqlCheck(
  c: SqlCheckSpec | SchemaCheckSpec | null
): SqlCheckSpec | null {
  if (!c) return null;
  if (
    "table_must_exist" in c ||
    "columns_by_table" in c ||
    "relationships_must_include" in c
  ) {
    return null;
  }
  return c as SqlCheckSpec;
}

export function asSchemaCheck(
  c: SqlCheckSpec | SchemaCheckSpec | null
): SchemaCheckSpec | null {
  if (!c) return null;
  if (
    "table_must_exist" in c ||
    "columns_by_table" in c ||
    "relationships_must_include" in c
  ) {
    return c as SchemaCheckSpec;
  }
  return null;
}
