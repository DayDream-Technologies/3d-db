import type { Schema } from "@/model/schema";
import { inferRelationships } from "@/model/schema";
import type { SchemaCheckSpec, ValidationItem, ValidationResult } from "../types";

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function getTable(s: Schema, name: string) {
  return s.tables.find((t) => norm(t.name) === norm(name));
}

function fkMatch(
  a: { table: string; column: string },
  b: { table: string; column: string }
): boolean {
  return norm(a.table) === norm(b.table) && norm(a.column) === norm(b.column);
}

export function validateSchemaLesson(
  schema: Schema,
  spec: SchemaCheckSpec
): ValidationResult {
  const items: ValidationItem[] = [];
  const rels = inferRelationships(schema);

  if (spec.min_table_count !== undefined) {
    const ok = schema.tables.length >= spec.min_table_count;
    items.push({
      label: "Table count",
      ok,
      detail: ok
        ? `${schema.tables.length} tables (≥ ${spec.min_table_count})`
        : `Need at least ${spec.min_table_count} tables, have ${schema.tables.length}`,
    });
  }

  for (const name of spec.table_must_exist ?? []) {
    const t = getTable(schema, name);
    items.push({
      label: `Table "${name}" exists`,
      ok: !!t,
      detail: t ? "Found" : "Create this table",
    });
  }

  for (const [tableName, expects] of Object.entries(
    spec.columns_by_table ?? {}
  )) {
    const t = getTable(schema, tableName);
    if (!t) {
      for (const col of expects) {
        items.push({
          label: `${tableName}.${col.name}`,
          ok: false,
          detail: "Table missing",
        });
      }
      continue;
    }
    for (const ex of expects) {
      const c = t.columns.find((x) => norm(x.name) === norm(ex.name));
      if (!c) {
        items.push({
          label: `${tableName}.${ex.name}`,
          ok: false,
          detail: "Column missing",
        });
        continue;
      }
      let ok = true;
      const bits: string[] = [];
      if (ex.primaryKey !== undefined) {
        const p = !!c.primaryKey === ex.primaryKey;
        ok = ok && p;
        if (!p) bits.push(`PK should be ${ex.primaryKey}`);
      }
      if (ex.notNull !== undefined) {
        const n = c.nullable === false;
        const p = n === ex.notNull;
        ok = ok && p;
        if (!p) bits.push(`NOT NULL should be ${ex.notNull}`);
      }
      if (ex.type_like) {
        const p = norm(c.type).includes(norm(ex.type_like));
        ok = ok && p;
        if (!p) bits.push(`type should contain "${ex.type_like}"`);
      }
      if (ex.indexed !== undefined) {
        const p = !!c.indexed === ex.indexed;
        ok = ok && p;
        if (!p) bits.push(`indexed should be ${ex.indexed}`);
      }
      if (ex.foreignKey) {
        if (!c.foreignKey) {
          ok = false;
          bits.push("needs FOREIGN KEY");
        } else {
          const p = fkMatch(c.foreignKey, ex.foreignKey);
          ok = ok && p;
          if (!p) bits.push(`FK → ${ex.foreignKey.table}.${ex.foreignKey.column}`);
        }
      }
      items.push({
        label: `${tableName}.${c.name}`,
        ok,
        detail: ok ? "OK" : bits.join("; "),
      });
    }
  }

  for (const r of spec.relationships_must_include ?? []) {
    const found = rels.some(
      (x) =>
        norm(x.fromTable) === norm(r.fromTable) &&
        norm(x.fromColumn) === norm(r.fromColumn) &&
        norm(x.toTable) === norm(r.toTable) &&
        norm(x.toColumn) === norm(r.toColumn)
    );
    items.push({
      label: `FK ${r.fromTable}.${r.fromColumn} → ${r.toTable}.${r.toColumn}`,
      ok: found,
      detail: found ? "Relationship present" : "Add the foreign key",
    });
  }

  const pass = items.length > 0 && items.every((i) => i.ok);
  if (items.length === 0) {
    return {
      pass: true,
      items: [
        {
          label: "Check",
          ok: true,
          detail: "No schema checks in this step",
        },
      ],
    };
  }
  return { pass, items };
}
