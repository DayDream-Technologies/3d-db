import type { Column, Schema, Table } from "@/model/schema";

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
};

export function parseJsonSchema(raw: string): Schema {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON");
  }
  if (!data || typeof data !== "object") throw new Error("Root must be an object");
  const obj = data as JsonSchema;
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
