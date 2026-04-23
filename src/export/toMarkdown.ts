import type { Schema } from "@/model/schema";
import { inferRelationships } from "@/model/schema";
import type { Tip } from "@/analysis/tips";
import { LEARN } from "@/resources/learnLinks";
import type { QueryModel } from "@/model/query";
import { generateSql } from "@/query/generateSql";

function asciiEr(schema: Schema): string {
  const rels = inferRelationships(schema);
  const lines: string[] = ["```", schema.name];
  for (const t of schema.tables) {
    lines.push(`[${t.name}]`);
  }
  for (const r of rels) {
    lines.push(`  ${r.fromTable}.${r.fromColumn} --> ${r.toTable}.${r.toColumn}`);
  }
  lines.push("```");
  return lines.join("\n");
}

export function toMarkdown(
  schema: Schema,
  tips: Tip[],
  selectedTable: string | null,
  options?: { includeQueries?: boolean; savedQueries?: QueryModel[] }
): string {
  const rels = inferRelationships(schema);
  const parts: string[] = [];
  parts.push(`# Database schema: ${schema.name}`);
  parts.push("");
  parts.push("## Overview");
  parts.push(
    `- Tables: ${schema.tables.length}`,
    `- Relationships (FK): ${rels.length}`,
    selectedTable ? `- Selected table: \`${selectedTable}\`` : "- Selected table: none",
    ""
  );

  parts.push("## Tables");
  for (const t of schema.tables.sort((a, b) => a.name.localeCompare(b.name))) {
    const rc =
      t.rowCount != null ? t.rowCount.toLocaleString() : "unknown";
    parts.push(`### \`${t.name}\` (${rc} rows)`);
    for (const c of t.columns.sort((a, b) => a.name.localeCompare(b.name))) {
      const tags: string[] = [];
      if (c.primaryKey) tags.push("PK");
      if (c.foreignKey)
        tags.push(`FK→\`${c.foreignKey.table}.${c.foreignKey.column}\``);
      if (c.indexed) tags.push("indexed");
      if (c.nullable === false) tags.push("NOT NULL");
      const tagStr = tags.length ? ` _(${tags.join(", ")})_` : "";
      parts.push(`- **${c.name}** (\`${c.type}\`)${tagStr}`);
    }
    parts.push("");
  }

  parts.push("## Relationships");
  if (rels.length === 0) parts.push("_None detected._");
  else {
    for (const r of rels.sort((a, b) => a.id.localeCompare(b.id))) {
      parts.push(
        `- \`${r.fromTable}.${r.fromColumn}\` → \`${r.toTable}.${r.toColumn}\``
      );
    }
  }
  parts.push("");

  parts.push("## Simplification / bloat tips");
  if (tips.length === 0) parts.push("_No automated tips._");
  else {
    for (const tip of tips) {
      const tbl = tip.table ? ` (\`${tip.table}\`)` : "";
      const learn = tip.learn
        ? ` _(Learn: [${LEARN[tip.learn].label}](${LEARN[tip.learn].url}))_`
        : "";
      parts.push(
        `- **[${tip.severity}]** ${tip.title}${tbl}: ${tip.detail}${learn}`
      );
    }
  }
  parts.push("");

  parts.push("## Further reading (W3Schools SQL Tutorial)");
  parts.push(
    `- [${LEARN.home.label}](${LEARN.home.url})`,
    `- [${LEARN.createTable.label}](${LEARN.createTable.url})`,
    `- [${LEARN.primaryKey.label}](${LEARN.primaryKey.url})`,
    `- [${LEARN.foreignKey.label}](${LEARN.foreignKey.url})`,
    `- [${LEARN.createIndex.label}](${LEARN.createIndex.url})`,
    `- [${LEARN.joins.label}](${LEARN.joins.url})`
  );
  parts.push("");

  if (
    options?.includeQueries &&
    options.savedQueries &&
    options.savedQueries.length > 0
  ) {
    parts.push("## Saved queries");
    for (const q of options.savedQueries) {
      parts.push(`### \`${q.name}\``);
      if (q.notes) parts.push(`_${q.notes.replace(/\n/g, " ")}_`);
      parts.push("");
      parts.push("```sql", generateSql(q), "```", "");
    }
  }

  parts.push("## ER sketch (text)");
  parts.push(asciiEr(schema));
  parts.push("");

  parts.push(
    "## Notes for AI agents",
    "Use the accompanying JSON export for exact structure. Row counts help spot large tables; FK arrows show join paths for query planning."
  );

  return parts.join("\n");
}
