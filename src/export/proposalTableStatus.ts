import type { Schema } from "@/model/schema";
import { inferRelationships } from "@/model/schema";
import type { SchemaDiff } from "./schemaDiff";

export type ProposalTableVisualStatus = "added" | "modified" | "unchanged";

/**
 * Maps each table in the proposal schema to a coarse diff status for 3D styling.
 * Row-count-only changes on otherwise identical tables count as "modified".
 */
export function buildProposalTableStatusMap(
  baseline: Schema | null,
  diff: SchemaDiff
): Map<string, ProposalTableVisualStatus> {
  const m = new Map<string, ProposalTableVisualStatus>();
  const beforeMap = baseline
    ? new Map(baseline.tables.map((t) => [t.name, t] as const))
    : null;

  for (const t of diff.newTables) {
    m.set(t.name, "added");
  }
  for (const d of diff.modifiedTables) {
    m.set(d.name, "modified");
  }
  for (const t of diff.unchangedTables) {
    const prev = beforeMap?.get(t.name);
    const rowChanged =
      !!prev && (prev.rowCount ?? null) !== (t.rowCount ?? null);
    m.set(t.name, rowChanged ? "modified" : "unchanged");
  }
  return m;
}

/** Relationship ids present in `proposal` but not in `baseline` (by FK edge id). */
export function newRelationshipIds(
  baseline: Schema | null,
  proposal: Schema
): Set<string> {
  const baseIds = baseline
    ? new Set(inferRelationships(baseline).map((r) => r.id))
    : new Set<string>();
  const out = new Set<string>();
  for (const r of inferRelationships(proposal)) {
    if (!baseIds.has(r.id)) out.add(r.id);
  }
  return out;
}
