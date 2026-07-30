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
    column?: { column: { expr: { type: string; value: string } } };
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
 
  if (d.resource !== "column" || !d.column?.column?.expr) return null;

  const name = d.column.column.expr.value;
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
  const fkColumns = new Set<{table: string; value: string}>();

  for (const def of defs) {
    if (!def || typeof def !== "object") continue;
    const d = def as { constraint_type?: string; definition?: unknown[]; reference_definition?: { table: unknown[]; definition: unknown[] } };
    if (d.constraint_type === "FOREIGN KEY") {
      const fkTable = (d.reference_definition?.table[0] as { table: string }).table;
      let fkValue: string;
      if(d.constraint_type === "FOREIGN KEY" && Array.isArray(d.definition)){
        for(const fk of d.definition) {
          fkValue = (fk as { column: { expr: { type: string; value: string} } }).column.expr.value;
          fkColumns.add({ table: fkTable, value:fkValue });
        }
      }
    }
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
      
      const fk = [...fkColumns].find(fk => fk.value === col.name);
      if(fk) {
        col.foreignKey = { table: fk.table, column: fk.value };
      }
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
