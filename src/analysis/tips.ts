import type { Schema, Table } from "@/model/schema";
import { inferRelationships } from "@/model/schema";
import type { LearnKey } from "@/resources/learnLinks";

export type TipSeverity = "info" | "warn" | "error";

export type Tip = {
  id: string;
  severity: TipSeverity;
  title: string;
  detail: string;
  table?: string;
  /** Optional W3Schools-linked concept for "Learn more" */
  learn?: LearnKey;
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.floor((p / 100) * (sorted.length - 1))
  );
  return sorted[idx];
}

function hasPk(t: Table): boolean {
  return t.columns.some((c) => c.primaryKey);
}

function fkColumns(t: Table) {
  return t.columns.filter((c) => c.foreignKey);
}

export function analyzeTips(schema: Schema): Tip[] {
  const tips: Tip[] = [];
  const rels = inferRelationships(schema);
  const tableByName = new Map(schema.tables.map((t) => [t.name, t]));

  const rowCounts = schema.tables
    .map((t) => t.rowCount ?? 0)
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  const p95 = percentile(rowCounts, 95) || 1;
  const p99 = percentile(rowCounts, 99) || p95;

  const referenced = new Set<string>();
  for (const r of rels) {
    referenced.add(r.toTable);
  }

  for (const t of schema.tables) {
    const rc = t.rowCount ?? 0;

    if (!hasPk(t)) {
      tips.push({
        id: `no-pk-${t.name}`,
        severity: "error",
        title: "Missing primary key",
        detail: `Table "${t.name}" has no primary key column. Add one for integrity and efficient joins.`,
        table: t.name,
        learn: "primaryKey",
      });
    }

    if (t.columns.length > 25) {
      tips.push({
        id: `wide-${t.name}`,
        severity: "warn",
        title: "Very wide table",
        detail: `"${t.name}" has ${t.columns.length} columns. Consider splitting by domain or normalizing.`,
        table: t.name,
        learn: "createTable",
      });
    }

    const nullableRatio =
      t.columns.filter((c) => c.nullable !== false).length /
      Math.max(1, t.columns.length);
    if (nullableRatio > 0.7 && t.columns.length > 5) {
      tips.push({
        id: `nulls-${t.name}`,
        severity: "info",
        title: "Many nullable columns",
        detail: `Most columns on "${t.name}" are nullable. Review whether some should be NOT NULL or moved to a related table.`,
        table: t.name,
        learn: "notNull",
      });
    }

    for (const col of fkColumns(t)) {
      const ref = col.foreignKey!;
      const target = tableByName.get(ref.table);
      const targetCol = target?.columns.find((c) => c.name === ref.column);
      if (targetCol && targetCol.indexed === false) {
        tips.push({
          id: `idx-fk-${t.name}-${col.name}`,
          severity: "warn",
          title: "FK target may need an index",
          detail: `Column ${ref.table}.${ref.column} is referenced by ${t.name}.${col.name} but is not marked indexed. Add an index for join performance.`,
          table: t.name,
          learn: "createIndex",
        });
      }
    }

    if (rc > 0 && rc >= p95) {
      const fks = fkColumns(t);
      const unindexedFk = fks.some((c) => c.indexed === false || c.indexed === undefined);
      if (unindexedFk || fks.length === 0) {
        tips.push({
          id: `bloat-${t.name}`,
          severity: rc >= p99 ? "error" : "warn",
          title: "Possible bloat hotspot",
          detail: `"${t.name}" has high row count (${rc.toLocaleString()}). Consider archiving cold data, partitioning, or verifying indexes on FKs.`,
          table: t.name,
          learn: "createIndex",
        });
      }
    }
  }

  // Orphan tables
  const outgoing = new Set(rels.map((r) => r.fromTable));
  for (const t of schema.tables) {
    const hasFkOut = outgoing.has(t.name);
    const isReferenced = referenced.has(t.name);
    if (!hasFkOut && !isReferenced && schema.tables.length > 1) {
      tips.push({
        id: `orphan-${t.name}`,
        severity: "info",
        title: "Isolated table",
        detail: `"${t.name}" has no FKs in or out in this schema. Verify it is used or document as standalone.`,
        table: t.name,
        learn: "foreignKey",
      });
    }
  }

  const severityOrder: Record<TipSeverity, number> = {
    error: 0,
    warn: 1,
    info: 2,
  };
  tips.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  return tips;
}
