import type { Column, Schema, Table } from "@/model/schema";
import {
  diffSchema,
  hasSchemaChanges,
  type ColumnChange,
  type SchemaDiff,
  type TableDiff,
} from "./schemaDiff";
import { rowCountPercentiles } from "@/scene/tableScale";

export type SqlDialect = "postgres" | "mysql" | "ansi";

export type ToSqlOptions = {
  /** Include DROP TABLE for tables removed since baseline. */
  includeDrops?: boolean;
  /** Add row-count and bloat comments above CREATE TABLE for new tables. */
  includeRowCountHints?: boolean;
  /** Override the default PERCENTILES (used for bloat hint labels). */
};

const DIALECT_LABELS: Record<SqlDialect, string> = {
  postgres: "PostgreSQL",
  mysql: "MySQL / MariaDB",
  ansi: "ANSI / generic SQL",
};

export function dialectLabel(d: SqlDialect): string {
  return DIALECT_LABELS[d];
}

function quoteIdent(name: string, dialect: SqlDialect): string {
  if (dialect === "mysql") return "`" + name.replace(/`/g, "``") + "`";
  return '"' + name.replace(/"/g, '""') + '"';
}

/** Map a (user-typed, Postgres-ish) type to the target dialect. */
function mapType(type: string, dialect: SqlDialect): string {
  const raw = (type ?? "").trim();
  if (!raw) return dialect === "mysql" ? "TEXT" : "TEXT";
  const lower = raw.toLowerCase();

  if (dialect === "postgres") {
    return raw;
  }

  if (dialect === "mysql") {
    if (lower === "serial") return "INT";
    if (lower === "bigserial") return "BIGINT";
    if (lower === "smallserial") return "SMALLINT";
    if (lower === "uuid") return "CHAR(36)";
    if (lower === "text") return "TEXT";
    if (lower === "timestamptz" || lower === "timestamp with time zone")
      return "TIMESTAMP";
    if (lower === "jsonb") return "JSON";
    if (lower === "bytea") return "BLOB";
    if (lower === "boolean" || lower === "bool") return "TINYINT(1)";
    if (lower === "int2") return "SMALLINT";
    if (lower === "int4") return "INT";
    if (lower === "int8") return "BIGINT";
    if (lower === "float4") return "FLOAT";
    if (lower === "float8") return "DOUBLE";
    if (lower === "numeric") return "DECIMAL";
    return raw.toUpperCase();
  }

  // ANSI / generic
  if (lower === "serial" || lower === "bigserial" || lower === "smallserial") {
    return lower === "bigserial"
      ? "BIGINT"
      : lower === "smallserial"
      ? "SMALLINT"
      : "INTEGER";
  }
  if (lower === "uuid") return "CHAR(36)";
  if (lower === "text") return "VARCHAR(4000)";
  if (lower === "timestamptz") return "TIMESTAMP WITH TIME ZONE";
  if (lower === "jsonb") return "JSON";
  if (lower === "bytea") return "BLOB";
  if (lower === "int2") return "SMALLINT";
  if (lower === "int4") return "INTEGER";
  if (lower === "int8") return "BIGINT";
  if (lower === "float4") return "REAL";
  if (lower === "float8") return "DOUBLE PRECISION";
  return raw.toUpperCase();
}

/** Should `serial`/`bigserial` emit an AUTO_INCREMENT suffix in MySQL? */
function isSerialType(type: string): boolean {
  const t = type.trim().toLowerCase();
  return t === "serial" || t === "bigserial" || t === "smallserial";
}

/** Render a column definition line for CREATE TABLE. */
function colDef(col: Column, dialect: SqlDialect, pkCount: number): string {
  const parts: string[] = [
    quoteIdent(col.name, dialect),
    mapType(col.type, dialect),
  ];

  // Serial / auto-increment. Only emit AUTO_INCREMENT on MySQL when the
  // column is a single-column PRIMARY KEY (MySQL's only legal placement).
  if (dialect === "mysql" && isSerialType(col.type) && col.primaryKey && pkCount === 1) {
    parts.push("AUTO_INCREMENT");
  }

  if (col.nullable === false || col.primaryKey) {
    parts.push("NOT NULL");
  }
  return parts.join(" ");
}

function pkConstraint(
  tableName: string,
  pkCols: string[],
  dialect: SqlDialect
): string {
  const cols = pkCols.map((c) => quoteIdent(c, dialect)).join(", ");
  const name = quoteIdent(`${tableName}_pkey`, dialect);
  return `CONSTRAINT ${name} PRIMARY KEY (${cols})`;
}

function fkConstraint(
  tableName: string,
  col: Column,
  dialect: SqlDialect
): string | null {
  if (!col.foreignKey) return null;
  const name = quoteIdent(
    `${tableName}_${col.name}_fkey`,
    dialect
  );
  const src = quoteIdent(col.name, dialect);
  const dstTable = quoteIdent(col.foreignKey.table, dialect);
  const dstCol = quoteIdent(col.foreignKey.column, dialect);
  return `CONSTRAINT ${name} FOREIGN KEY (${src}) REFERENCES ${dstTable} (${dstCol})`;
}

function indexStatement(
  tableName: string,
  colName: string,
  dialect: SqlDialect
): string {
  const ix = quoteIdent(`idx_${tableName}_${colName}`, dialect);
  const t = quoteIdent(tableName, dialect);
  const c = quoteIdent(colName, dialect);
  return `CREATE INDEX ${ix} ON ${t} (${c});`;
}

function dropIndexStatement(
  tableName: string,
  colName: string,
  dialect: SqlDialect
): string {
  const ix = quoteIdent(`idx_${tableName}_${colName}`, dialect);
  if (dialect === "mysql") {
    return `DROP INDEX ${ix} ON ${quoteIdent(tableName, dialect)};`;
  }
  return `DROP INDEX IF EXISTS ${ix};`;
}

function bloatLabel(
  count: number,
  p95: number,
  p99: number
): string {
  if (count <= 0) return "no rows";
  if (count >= p99) return `very high (≥p99)`;
  if (count >= p95) return `high (≥p95)`;
  return "typical";
}

function createTableSql(
  table: Table,
  dialect: SqlDialect,
  opts: { includeRowCountHints: boolean; p95: number; p99: number }
): string {
  const lines: string[] = [];
  if (opts.includeRowCountHints) {
    if (typeof table.rowCount === "number") {
      lines.push(
        `-- ${table.name}: ~${table.rowCount.toLocaleString()} rows (bloat: ${bloatLabel(
          table.rowCount,
          opts.p95,
          opts.p99
        )})`
      );
    } else {
      lines.push(`-- ${table.name}: row count unknown`);
    }
  }

  const pkCols = table.columns.filter((c) => c.primaryKey).map((c) => c.name);
  const inner: string[] = [];
  for (const col of table.columns) {
    inner.push("  " + colDef(col, dialect, pkCols.length));
  }
  if (pkCols.length > 0) {
    inner.push("  " + pkConstraint(table.name, pkCols, dialect));
  }
  for (const col of table.columns) {
    const fk = fkConstraint(table.name, col, dialect);
    if (fk) inner.push("  " + fk);
  }

  lines.push(
    `CREATE TABLE ${quoteIdent(table.name, dialect)} (\n${inner.join(",\n")}\n);`
  );

  // Secondary indexes (non-PK indexed columns). MySQL indexes PKs automatically
  // and adding a duplicate index on the PK column is wasteful, so skip PK cols.
  for (const col of table.columns) {
    if (col.indexed && !col.primaryKey) {
      lines.push(indexStatement(table.name, col.name, dialect));
    }
  }
  return lines.join("\n");
}

function alterAddColumn(
  tableName: string,
  col: Column,
  dialect: SqlDialect
): string[] {
  const t = quoteIdent(tableName, dialect);
  const parts: string[] = [quoteIdent(col.name, dialect), mapType(col.type, dialect)];
  if (col.nullable === false) parts.push("NOT NULL");
  const out: string[] = [`ALTER TABLE ${t} ADD COLUMN ${parts.join(" ")};`];
  if (col.indexed && !col.primaryKey) {
    out.push(indexStatement(tableName, col.name, dialect));
  }
  if (col.foreignKey) {
    const fk = fkConstraint(tableName, col, dialect);
    if (fk) out.push(`ALTER TABLE ${t} ADD ${fk};`);
  }
  if (col.primaryKey) {
    out.push(
      `ALTER TABLE ${t} ADD CONSTRAINT ${quoteIdent(
        `${tableName}_pkey`,
        dialect
      )} PRIMARY KEY (${quoteIdent(col.name, dialect)});`
    );
  }
  return out;
}

function alterDropColumn(
  tableName: string,
  colName: string,
  dialect: SqlDialect
): string {
  return `ALTER TABLE ${quoteIdent(tableName, dialect)} DROP COLUMN ${quoteIdent(
    colName,
    dialect
  )};`;
}

function alterColumnType(
  tableName: string,
  colName: string,
  newType: string,
  after: Column,
  dialect: SqlDialect
): string {
  const t = quoteIdent(tableName, dialect);
  const c = quoteIdent(colName, dialect);
  const mapped = mapType(newType, dialect);
  if (dialect === "mysql") {
    const nn = after.nullable === false ? " NOT NULL" : "";
    return `ALTER TABLE ${t} MODIFY COLUMN ${c} ${mapped}${nn};`;
  }
  if (dialect === "postgres") {
    return `ALTER TABLE ${t} ALTER COLUMN ${c} TYPE ${mapped};`;
  }
  return `ALTER TABLE ${t} ALTER COLUMN ${c} SET DATA TYPE ${mapped};`;
}

function alterNullable(
  tableName: string,
  colName: string,
  notNullAfter: boolean,
  after: Column,
  dialect: SqlDialect
): string {
  const t = quoteIdent(tableName, dialect);
  const c = quoteIdent(colName, dialect);
  if (dialect === "mysql") {
    const mapped = mapType(after.type, dialect);
    const nn = notNullAfter ? " NOT NULL" : " NULL";
    return `ALTER TABLE ${t} MODIFY COLUMN ${c} ${mapped}${nn};`;
  }
  if (notNullAfter) {
    return `ALTER TABLE ${t} ALTER COLUMN ${c} SET NOT NULL;`;
  }
  return `ALTER TABLE ${t} ALTER COLUMN ${c} DROP NOT NULL;`;
}

function alterPkChange(
  tableName: string,
  newPkCols: string[],
  dialect: SqlDialect
): string[] {
  const t = quoteIdent(tableName, dialect);
  const out: string[] = [];
  if (dialect === "mysql") {
    if (newPkCols.length === 0) {
      out.push(`ALTER TABLE ${t} DROP PRIMARY KEY;`);
    } else {
      out.push(
        `ALTER TABLE ${t} DROP PRIMARY KEY, ADD PRIMARY KEY (${newPkCols
          .map((c) => quoteIdent(c, dialect))
          .join(", ")});`
      );
    }
    return out;
  }
  const pkName = quoteIdent(`${tableName}_pkey`, dialect);
  if (dialect === "postgres") {
    out.push(`ALTER TABLE ${t} DROP CONSTRAINT IF EXISTS ${pkName};`);
  } else {
    out.push(
      `ALTER TABLE ${t} DROP CONSTRAINT ${pkName};  -- may fail if the actual constraint is named differently`
    );
  }
  if (newPkCols.length > 0) {
    out.push(
      `ALTER TABLE ${t} ADD CONSTRAINT ${pkName} PRIMARY KEY (${newPkCols
        .map((c) => quoteIdent(c, dialect))
        .join(", ")});`
    );
  }
  return out;
}

function alterFkChange(
  tableName: string,
  colName: string,
  ch: Extract<ColumnChange, { kind: "foreignKey" }>,
  dialect: SqlDialect
): string[] {
  const t = quoteIdent(tableName, dialect);
  const fkName = quoteIdent(`${tableName}_${colName}_fkey`, dialect);
  const out: string[] = [];
  if (ch.before) {
    if (dialect === "mysql") {
      out.push(`ALTER TABLE ${t} DROP FOREIGN KEY ${fkName};`);
    } else if (dialect === "postgres") {
      out.push(`ALTER TABLE ${t} DROP CONSTRAINT IF EXISTS ${fkName};`);
    } else {
      out.push(
        `ALTER TABLE ${t} DROP CONSTRAINT ${fkName};  -- may fail if the actual constraint is named differently`
      );
    }
  }
  if (ch.after) {
    const src = quoteIdent(colName, dialect);
    const dstT = quoteIdent(ch.after.table, dialect);
    const dstC = quoteIdent(ch.after.column, dialect);
    out.push(
      `ALTER TABLE ${t} ADD CONSTRAINT ${fkName} FOREIGN KEY (${src}) REFERENCES ${dstT} (${dstC});`
    );
  }
  return out;
}

function alterIndexChange(
  tableName: string,
  colName: string,
  after: boolean,
  dialect: SqlDialect
): string {
  return after
    ? indexStatement(tableName, colName, dialect)
    : dropIndexStatement(tableName, colName, dialect);
}

function emitTableDiff(diff: TableDiff, dialect: SqlDialect): string {
  const lines: string[] = [];
  lines.push(`-- ${diff.name}: ${diff.columnDiffs.length} column change(s)`);

  const added = diff.columnDiffs.filter((d) => d.kind === "added");
  const removed = diff.columnDiffs.filter((d) => d.kind === "removed");
  const modified = diff.columnDiffs.filter((d) => d.kind === "modified");

  for (const d of added) {
    if (d.kind !== "added") continue;
    lines.push(...alterAddColumn(diff.name, d.column, dialect));
  }
  for (const d of modified) {
    if (d.kind !== "modified") continue;
    for (const ch of d.changes) {
      switch (ch.kind) {
        case "type":
          lines.push(
            alterColumnType(diff.name, d.name, ch.after, d.after, dialect)
          );
          break;
        case "nullable":
          lines.push(
            alterNullable(diff.name, d.name, ch.after, d.after, dialect)
          );
          break;
        case "primaryKey": {
          const newPk = diff.after.columns
            .filter((c) => c.primaryKey)
            .map((c) => c.name);
          lines.push(...alterPkChange(diff.name, newPk, dialect));
          break;
        }
        case "foreignKey":
          lines.push(...alterFkChange(diff.name, d.name, ch, dialect));
          break;
        case "indexed":
          lines.push(
            alterIndexChange(diff.name, d.name, ch.after, dialect)
          );
          break;
      }
    }
  }
  for (const d of removed) {
    if (d.kind !== "removed") continue;
    lines.push(alterDropColumn(diff.name, d.column.name, dialect));
  }
  return lines.join("\n");
}

function deleteTableSql(t: Table, dialect: SqlDialect): string {
  return `DROP TABLE ${quoteIdent(t.name, dialect)};`;
}

/** Build the full SQL export string. */
export function toSql(
  baseline: Schema | null,
  current: Schema,
  dialect: SqlDialect,
  options: ToSqlOptions = {}
): { sql: string; diff: SchemaDiff } {
  const includeDrops = options.includeDrops ?? false;
  const includeRowCountHints = options.includeRowCountHints ?? true;

  const diff = diffSchema(baseline, current);
  const pct = rowCountPercentiles(current);

  const header: string[] = [];
  header.push(`-- Schema: ${current.name}`);
  header.push(`-- Dialect: ${dialectLabel(dialect)}`);
  header.push(`-- Generated: ${new Date().toISOString()}`);
  if (diff.baselineMissing) {
    header.push(`-- Baseline: none (all tables authored manually)`);
  } else {
    header.push(
      `-- Baseline: imported schema (${(baseline as Schema).tables.length} table${
        (baseline as Schema).tables.length === 1 ? "" : "s"
      })`
    );
  }

  if (!hasSchemaChanges(diff)) {
    header.push(`-- No schema changes detected since import.`);
    return { sql: header.join("\n") + "\n", diff };
  }

  const sections: string[] = [];

  if (diff.newTables.length > 0) {
    sections.push(
      sectionHeader(
        diff.baselineMissing ? "Create tables" : "New tables"
      )
    );
    for (const t of diff.newTables) {
      sections.push(
        createTableSql(t, dialect, {
          includeRowCountHints,
          p95: pct.p95,
          p99: pct.p99,
        })
      );
      sections.push("");
    }
  }

  if (diff.modifiedTables.length > 0) {
    sections.push(sectionHeader("Modified tables"));
    for (const d of diff.modifiedTables) {
      sections.push(emitTableDiff(d, dialect));
      sections.push("");
    }
  }

  if (diff.deletedTables.length > 0) {
    if (includeDrops) {
      sections.push(sectionHeader("Dropped tables"));
      for (const t of diff.deletedTables) {
        sections.push(deleteTableSql(t, dialect));
      }
      sections.push("");
    } else {
      sections.push(sectionHeader("Dropped tables (excluded)"));
      for (const t of diff.deletedTables) {
        sections.push(`-- ${t.name} was removed; DROP TABLE omitted.`);
      }
      sections.push("");
    }
  }

  return {
    sql: header.join("\n") + "\n\n" + sections.join("\n") + "\n",
    diff,
  };
}

function sectionHeader(label: string): string {
  const bar = "-- " + "─".repeat(Math.max(4, 60 - label.length - 4));
  return `-- ── ${label} ${bar}`;
}
