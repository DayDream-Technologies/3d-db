import { Parser } from "node-sql-parser";
import type { Column, Schema, Table } from "@/model/schema";

type CreateTableAst = {
  type: "create";
  keyword: string;
  table: Array<{ db?: string; table: string }>;
  create_definitions?: unknown[];
};

function isCreateTable(stmt: unknown): stmt is CreateTableAst {
  if (!stmt || typeof stmt !== "object") return false;
  const s = stmt as { type?: string; keyword?: string };
  return s.type === "create" && s.keyword === "table";
}

function getTableName(ast: CreateTableAst): string {
  const t = ast.table?.[0];
  if (!t?.table) throw new Error("CREATE TABLE missing table name");
  return t.table;
}

function parseColumnDefinition(def: unknown): Column | null {
  if (!def || typeof def !== "object") return null;
  const d = def as {
    resource?: string;
    column?: { expr: { type: string; column: string } };
    definition?: { dataType?: string; length?: number };
    primary_key?: { column: string };
    reference_definition?: {
      table: Array<{ table: string }>;
      definition: Array<{ column: string }>;
    };
    nullable?: { value: string };
    unique?: boolean;
    key?: string;
    constraint_type?: string;
  };

  if (d.resource !== "column" || !d.column?.expr?.column) return null;

  const name = d.column.expr.column;
  const dataType = d.definition?.dataType ?? "unknown";
  const length = d.definition?.length;
  const typeStr =
    length != null ? `${String(dataType)}(${length})` : String(dataType);

  const col: Column = {
    name,
    type: typeStr,
    nullable: d.nullable?.value !== "not null",
  };

  if (d.primary_key || d.key === "primary key") {
    col.primaryKey = true;
  }

  const ref = d.reference_definition;
  if (ref?.table?.[0]?.table && ref.definition?.[0]?.column) {
    col.foreignKey = {
      table: ref.table[0].table,
      column: ref.definition[0].column,
    };
  }

  return col;
}

function extractColumns(ast: CreateTableAst): Column[] {
  const defs = ast.create_definitions;
  if (!Array.isArray(defs)) return [];

  const columns: Column[] = [];
  const pkColumns = new Set<string>();

  for (const def of defs) {
    if (!def || typeof def !== "object") continue;
    const d = def as { constraint_type?: string; definition?: unknown[] };
    if (d.constraint_type === "primary key" && Array.isArray(d.definition)) {
      for (const pk of d.definition) {
        if (
          pk &&
          typeof pk === "object" &&
          "column" in pk &&
          typeof (pk as { column: string }).column === "string"
        ) {
          pkColumns.add((pk as { column: string }).column);
        }
      }
    }
  }

  for (const def of defs) {
    const col = parseColumnDefinition(def);
    if (col) {
      if (pkColumns.has(col.name)) col.primaryKey = true;
      columns.push(col);
    }
  }

  return columns;
}

export function parseSqlSchema(sql: string): Schema {
  const parser = new Parser();
  const ast = parser.astify(sql, { database: "postgresql" });
  const statements = Array.isArray(ast) ? ast : [ast];

  const tables: Table[] = [];

  for (const stmt of statements) {
    if (!isCreateTable(stmt)) continue;
    const name = getTableName(stmt);
    const columns = extractColumns(stmt);
    tables.push({ name, columns });
  }

  if (tables.length === 0) {
    throw new Error("No CREATE TABLE statements found (try PostgreSQL-style DDL)");
  }

  return {
    name: "SQL import",
    tables,
  };
}
