/** Intermediate representation for schema + optional stats */

export type ForeignKeyRef = {
  table: string;
  column: string;
};

export type Column = {
  name: string;
  type: string;
  primaryKey?: boolean;
  foreignKey?: ForeignKeyRef;
  nullable?: boolean;
  indexed?: boolean;
};

export type Table = {
  name: string;
  columns: Column[];
  /** Row count from import or user override */
  rowCount?: number;
  sizeBytes?: number;
};

export type Relationship = {
  id: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
};

export type Schema = {
  name: string;
  tables: Table[];
};

export function inferRelationships(schema: Schema): Relationship[] {
  const rels: Relationship[] = [];
  for (const table of schema.tables) {
    for (const col of table.columns) {
      if (!col.foreignKey) continue;
      const id = `${table.name}.${col.name}->${col.foreignKey.table}.${col.foreignKey.column}`;
      rels.push({
        id,
        fromTable: table.name,
        fromColumn: col.name,
        toTable: col.foreignKey.table,
        toColumn: col.foreignKey.column,
      });
    }
  }
  return rels;
}

export function getTable(schema: Schema, name: string): Table | undefined {
  return schema.tables.find((t) => t.name === name);
}

export function mergeRowCounts(
  schema: Schema,
  overrides: Record<string, number | undefined>
): Schema {
  return {
    ...schema,
    tables: schema.tables.map((t) => {
      const o = overrides[t.name];
      if (o === undefined) return t;
      return { ...t, rowCount: o };
    }),
  };
}
