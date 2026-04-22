import type { Schema } from "@/model/schema";
import { inferRelationships } from "@/model/schema";
import type { Tip } from "@/analysis/tips";

export type AgentExportPayload = {
  version: 1;
  exportedAt: string;
  schema: {
    name: string;
    tables: {
      name: string;
      rowCount: number | null;
      sizeBytes: number | null;
      columns: {
        name: string;
        type: string;
        primaryKey: boolean;
        nullable: boolean;
        indexed: boolean;
        foreignKey: { table: string; column: string } | null;
      }[];
    }[];
    relationships: {
      fromTable: string;
      fromColumn: string;
      toTable: string;
      toColumn: string;
    }[];
  };
  selection: { selectedTable: string | null };
  tips: { id: string; severity: string; title: string; detail: string; table?: string }[];
};

export function toAgentJson(
  schema: Schema,
  tips: Tip[],
  selectedTable: string | null
): string {
  const rels = inferRelationships(schema);
  const payload: AgentExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    schema: {
      name: schema.name,
      tables: schema.tables
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((t) => ({
          name: t.name,
          rowCount: t.rowCount ?? null,
          sizeBytes: t.sizeBytes ?? null,
          columns: t.columns
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((c) => ({
              name: c.name,
              type: c.type,
              primaryKey: !!c.primaryKey,
              nullable: c.nullable !== false,
              indexed: !!c.indexed,
              foreignKey: c.foreignKey
                ? { table: c.foreignKey.table, column: c.foreignKey.column }
                : null,
            })),
        })),
      relationships: rels
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((r) => ({
          fromTable: r.fromTable,
          fromColumn: r.fromColumn,
          toTable: r.toTable,
          toColumn: r.toColumn,
        })),
    },
    selection: { selectedTable },
    tips: tips.map((tip) => ({
      id: tip.id,
      severity: tip.severity,
      title: tip.title,
      detail: tip.detail,
      table: tip.table,
    })),
  };
  return JSON.stringify(payload, null, 2);
}
