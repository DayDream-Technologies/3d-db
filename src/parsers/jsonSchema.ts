import type { Column, Schema, Table } from "@/model/schema";
import type { QueryModel } from "@/model/query";

/** Extended JSON — see docs/SCHEMA_FORMAT.md */

type JsonColumn = {
  name: string;
  type: string;
  primaryKey?: boolean;
  foreignKey?: { table: string; column: string };
  nullable?: boolean;
  indexed?: boolean;
};

type JsonTable = {
  name: string;
  columns: JsonColumn[];
  rowCount?: number;
  sizeBytes?: number;
};

type JsonSchema = {
  name?: string;
  tables: JsonTable[];
  queries?: unknown;
};

function schemaFromJsonData(obj: JsonSchema): Schema {
  if (!Array.isArray(obj.tables)) throw new Error('Missing "tables" array');

  const tables: Table[] = obj.tables.map((jt, i) => {
    if (!jt?.name || typeof jt.name !== "string") {
      throw new Error(`tables[${i}]: missing name`);
    }
    if (!Array.isArray(jt.columns)) {
      throw new Error(`tables[${i}]: columns must be an array`);
    }
    const columns: Column[] = jt.columns.map((jc, j) => {
      if (!jc?.name || typeof jc.name !== "string") {
        throw new Error(`tables[${i}].columns[${j}]: missing name`);
      }
      return {
        name: jc.name,
        type: typeof jc.type === "string" ? jc.type : "unknown",
        primaryKey: jc.primaryKey,
        foreignKey: jc.foreignKey,
        nullable: jc.nullable,
        indexed: jc.indexed,
      };
    });
    return {
      name: jt.name,
      columns,
      rowCount: typeof jt.rowCount === "number" ? jt.rowCount : undefined,
      sizeBytes: typeof jt.sizeBytes === "number" ? jt.sizeBytes : undefined,
    };
  });

  return {
    name: typeof obj.name === "string" ? obj.name : "Imported schema",
    tables,
  };
}

function isQueryModelish(x: unknown): x is QueryModel {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    Array.isArray(o.select) &&
    o.from != null &&
    typeof o.from === "object"
  );
}

function parseQueriesField(obj: object): QueryModel[] {
  const q = (obj as JsonSchema).queries;
  if (q == null) return [];
  if (!Array.isArray(q)) return [];
  return q.filter(isQueryModelish);
}

export function parseJsonSchema(raw: string): Schema {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON");
  }
  if (!data || typeof data !== "object") throw new Error("Root must be an object");
  return schemaFromJsonData(data as JsonSchema);
}

/** Like parseJsonSchema but also returns optional `queries` for save/load round-trip. */
export function parseJsonSchemaWithQueries(
  raw: string
): { schema: Schema; queries: QueryModel[] } {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON");
  }
  if (!data || typeof data !== "object") throw new Error("Root must be an object");
  const o = data as object;
  return { schema: schemaFromJsonData(o as JsonSchema), queries: parseQueriesField(o) };
}
