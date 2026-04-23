import type { Schema } from "@/model/schema";
import type { QueryModel } from "@/model/query";

/**
 * Re-builds the extended JSON shape (tables + optional queries) for download / re-import.
 */
export function toExtendedSchemaJsonString(
  schema: Schema,
  opts: { includeQueries: boolean; savedQueries: QueryModel[] }
): string {
  const tables = schema.tables.map((t) => ({
    name: t.name,
    rowCount: t.rowCount,
    sizeBytes: t.sizeBytes,
    columns: t.columns.map((c) => ({
      name: c.name,
      type: c.type,
      primaryKey: c.primaryKey,
      foreignKey: c.foreignKey,
      nullable: c.nullable,
      indexed: c.indexed,
    })),
  }));

  const o: { name: string; tables: typeof tables; queries?: QueryModel[] } = {
    name: schema.name,
    tables,
  };

  if (opts.includeQueries && opts.savedQueries.length > 0) {
    o.queries = opts.savedQueries;
  }

  return JSON.stringify(o, null, 2);
}
