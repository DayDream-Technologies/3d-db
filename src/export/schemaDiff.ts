import type { Column, ForeignKeyRef, Schema, Table } from "@/model/schema";

export type ColumnChange =
  | { kind: "type"; before: string; after: string }
  | { kind: "nullable"; before: boolean; after: boolean }
  | { kind: "primaryKey"; before: boolean; after: boolean }
  | { kind: "indexed"; before: boolean; after: boolean }
  | {
      kind: "foreignKey";
      before: ForeignKeyRef | undefined;
      after: ForeignKeyRef | undefined;
    };

export type ColumnDiff =
  | { kind: "added"; column: Column }
  | { kind: "removed"; column: Column }
  | {
      kind: "modified";
      name: string;
      before: Column;
      after: Column;
      changes: ColumnChange[];
    };

export type TableDiff = {
  name: string;
  before: Table;
  after: Table;
  columnDiffs: ColumnDiff[];
  rowCountChanged: boolean;
};

export type SchemaDiff = {
  /** Tables present in `after` but not `before`. */
  newTables: Table[];
  /** Tables present in `before` but not `after`. */
  deletedTables: Table[];
  /** Tables present in both with structural differences. */
  modifiedTables: TableDiff[];
  /** Tables present in both that are structurally identical. */
  unchangedTables: Table[];
  /** True when `before` was null - treat everything as new. */
  baselineMissing: boolean;
};

function fkEq(a: ForeignKeyRef | undefined, b: ForeignKeyRef | undefined): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.table === b.table && a.column === b.column;
}

function boolEq(a: boolean | undefined, b: boolean | undefined): boolean {
  return Boolean(a) === Boolean(b);
}

function diffColumn(before: Column, after: Column): ColumnChange[] {
  const out: ColumnChange[] = [];
  if ((before.type ?? "").trim() !== (after.type ?? "").trim()) {
    out.push({ kind: "type", before: before.type, after: after.type });
  }
  const bNotNull = before.nullable === false;
  const aNotNull = after.nullable === false;
  if (bNotNull !== aNotNull) {
    out.push({ kind: "nullable", before: bNotNull, after: aNotNull });
  }
  if (!boolEq(before.primaryKey, after.primaryKey)) {
    out.push({
      kind: "primaryKey",
      before: !!before.primaryKey,
      after: !!after.primaryKey,
    });
  }
  if (!boolEq(before.indexed, after.indexed)) {
    out.push({
      kind: "indexed",
      before: !!before.indexed,
      after: !!after.indexed,
    });
  }
  if (!fkEq(before.foreignKey, after.foreignKey)) {
    out.push({
      kind: "foreignKey",
      before: before.foreignKey,
      after: after.foreignKey,
    });
  }
  return out;
}

function diffTable(before: Table, after: Table): TableDiff {
  const beforeCols = new Map(before.columns.map((c) => [c.name, c] as const));
  const afterCols = new Map(after.columns.map((c) => [c.name, c] as const));
  const diffs: ColumnDiff[] = [];

  for (const col of after.columns) {
    const prev = beforeCols.get(col.name);
    if (!prev) {
      diffs.push({ kind: "added", column: col });
      continue;
    }
    const changes = diffColumn(prev, col);
    if (changes.length > 0) {
      diffs.push({
        kind: "modified",
        name: col.name,
        before: prev,
        after: col,
        changes,
      });
    }
  }
  for (const col of before.columns) {
    if (!afterCols.has(col.name)) {
      diffs.push({ kind: "removed", column: col });
    }
  }

  return {
    name: after.name,
    before,
    after,
    columnDiffs: diffs,
    rowCountChanged: (before.rowCount ?? null) !== (after.rowCount ?? null),
  };
}

/**
 * Compute a table-level diff between an optional `before` (baseline) schema
 * and the current `after` schema. When `before` is null, every table in
 * `after` is treated as new.
 */
export function diffSchema(
  before: Schema | null,
  after: Schema
): SchemaDiff {
  if (!before) {
    return {
      newTables: [...after.tables],
      deletedTables: [],
      modifiedTables: [],
      unchangedTables: [],
      baselineMissing: true,
    };
  }

  const beforeMap = new Map(before.tables.map((t) => [t.name, t] as const));
  const afterMap = new Map(after.tables.map((t) => [t.name, t] as const));

  const newTables: Table[] = [];
  const modified: TableDiff[] = [];
  const unchanged: Table[] = [];

  for (const t of after.tables) {
    const prev = beforeMap.get(t.name);
    if (!prev) {
      newTables.push(t);
      continue;
    }
    const d = diffTable(prev, t);
    if (d.columnDiffs.length > 0) modified.push(d);
    else unchanged.push(t);
  }

  const deleted = before.tables.filter((t) => !afterMap.has(t.name));

  return {
    newTables,
    deletedTables: deleted,
    modifiedTables: modified,
    unchangedTables: unchanged,
    baselineMissing: false,
  };
}

/** True when there are any changes worth emitting SQL for. */
export function hasSchemaChanges(d: SchemaDiff): boolean {
  return (
    d.newTables.length > 0 ||
    d.modifiedTables.length > 0 ||
    d.deletedTables.length > 0
  );
}
