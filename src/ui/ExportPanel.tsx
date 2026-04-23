import { useMemo, useState } from "react";
import { useAppStore } from "@/state/store";
import { toAgentJson } from "@/export/toAgentJson";
import { toMarkdown } from "@/export/toMarkdown";
import { toExtendedSchemaJsonString } from "@/export/schemaFileJson";
import {
  dialectLabel,
  toSql,
  type SqlDialect,
} from "@/export/toSql";
import { hasSchemaChanges } from "@/export/schemaDiff";

function download(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const DIALECTS: readonly SqlDialect[] = ["postgres", "mysql", "ansi"] as const;

const FILE_SUFFIX: Record<SqlDialect, string> = {
  postgres: "postgres",
  mysql: "mysql",
  ansi: "ansi",
};

const SHORT_LABEL: Record<SqlDialect, string> = {
  postgres: "PostgreSQL",
  mysql: "MySQL",
  ansi: "ANSI",
};

export function ExportPanel() {
  const schema = useAppStore((s) => s.schema);
  const importedSchema = useAppStore((s) => s.importedSchema);
  const tips = useAppStore((s) => s.tips);
  const selectedTable = useAppStore((s) => s.selectedTable);
  const savedQueries = useAppStore((s) => s.savedQueries);
  const includeQueries = useAppStore((s) => s.includeQueriesInExport);
  const setInclude = useAppStore((s) => s.setIncludeQueriesInExport);
  const schemaDirty = useAppStore((s) => s.schemaDirty);
  const markSchemaSaved = useAppStore((s) => s.markSchemaSaved);
  const [includeRowHints, setIncludeRowHints] = useState(true);

  const preview = useMemo(
    () =>
      schema
        ? toSql(importedSchema, schema, "postgres", {
            includeDrops: false,
            includeRowCountHints: includeRowHints,
          })
        : null,
    [importedSchema, schema, includeRowHints]
  );

  if (!schema || !preview) {
    return (
      <div className="p-3 text-sm text-slate-500">Nothing to export yet.</div>
    );
  }

  const qOpts = {
    includeQueries: includeQueries,
    savedQueries,
  };
  const json = toAgentJson(schema, tips, selectedTable, qOpts);
  const md = toMarkdown(schema, tips, selectedTable, qOpts);
  const base = schema.name.replace(/\s+/g, "_").slice(0, 40);
  const schemaFile = toExtendedSchemaJsonString(schema, {
    includeQueries: includeQueries,
    savedQueries,
  });

  const diff = preview.diff;
  const baselineLabel = diff.baselineMissing
    ? "No baseline - all tables will be CREATE-ed"
    : `Baseline: imported schema (${
        importedSchema?.tables.length ?? 0
      } tables)`;
  const changeSummary = hasSchemaChanges(diff)
    ? `${diff.newTables.length} new · ${diff.modifiedTables.length} modified · ${diff.deletedTables.length} deleted`
    : "No schema changes since import";

  const buildSql = (dialect: SqlDialect) => {
    let includeDrops = false;
    if (diff.deletedTables.length > 0) {
      const names = diff.deletedTables.map((t) => t.name).join(", ");
      includeDrops = confirm(
        `The following table${
          diff.deletedTables.length === 1 ? " was" : "s were"
        } removed since import:\n\n  ${names}\n\n` +
          "Include DROP TABLE statements in the SQL export?\n\n" +
          "OK  = include DROP TABLE (destructive if run as-is)\n" +
          "Cancel = omit DROP TABLE and leave those tables alone"
      );
    }
    return toSql(importedSchema, schema, dialect, {
      includeDrops,
      includeRowCountHints: includeRowHints,
    }).sql;
  };

  const copySql = async (dialect: SqlDialect) => {
    const sql = buildSql(dialect);
    try {
      await navigator.clipboard.writeText(sql);
      alert(`${SHORT_LABEL[dialect]} SQL copied.`);
    } catch {
      alert("Copy failed");
    }
  };

  const downloadSql = (dialect: SqlDialect) => {
    const sql = buildSql(dialect);
    download(
      `${base}_${FILE_SUFFIX[dialect]}.sql`,
      sql,
      "application/sql;charset=utf-8"
    );
  };

  return (
    <div className="space-y-3 p-3 text-sm">
      <p className="text-xs leading-relaxed text-slate-500">
        Structured exports for LLMs: paste into chats or version-control alongside
        migrations.
      </p>
      {schemaDirty && (
        <div className="rounded border border-amber-700/40 bg-amber-950/40 p-2 text-[11px] text-amber-200">
          You have unsaved schema edits. Use{" "}
          <span className="font-semibold text-amber-100">Export schema JSON</span>{" "}
          below to save a portable copy.
        </div>
      )}
      <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
        <input
          type="checkbox"
          checked={includeQueries}
          onChange={(e) => setInclude(e.target.checked)}
        />
        Include saved queries (Builder + Saved tab)
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
          onClick={() =>
            void navigator.clipboard.writeText(json).then(
              () => alert("JSON copied."),
              () => alert("Copy failed")
            )
          }
        >
          Copy JSON
        </button>
        <button
          type="button"
          className="rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
          onClick={() =>
            void navigator.clipboard.writeText(md).then(
              () => alert("Markdown copied."),
              () => alert("Copy failed")
            )
          }
        >
          Copy Markdown
        </button>
        <button
          type="button"
          className="rounded border border-sky-800/60 bg-sky-950/40 px-3 py-1.5 text-xs text-sky-100 hover:bg-sky-900/50"
          onClick={() => download(`${base}_schema.json`, json, "application/json")}
        >
          Download JSON
        </button>
        <button
          type="button"
          className="rounded border border-sky-800/60 bg-sky-950/40 px-3 py-1.5 text-xs text-sky-100 hover:bg-sky-900/50"
          onClick={() =>
            download(
              `${base}_schema.md`,
              md,
              "text/markdown;charset=utf-8"
            )
          }
        >
          Download Markdown
        </button>
        <button
          type="button"
          className="rounded border border-emerald-800/50 bg-emerald-950/30 px-3 py-1.5 text-xs text-emerald-100 hover:bg-emerald-900/40"
          title="Re-importable schema JSON (same format as Import → JSON), with optional queries"
          onClick={() => {
            download(`${base}_full.json`, schemaFile, "application/json");
            markSchemaSaved();
          }}
        >
          Export schema JSON
        </button>
      </div>
      <div className="space-y-2 rounded border border-slate-800 bg-slate-950/50 p-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              SQL (DDL)
            </h4>
            <p className="text-[11px] text-slate-500">
              Emits CREATE TABLE for new tables and ALTER TABLE for modified
              ones. Untouched tables are skipped.
            </p>
          </div>
        </div>
        <div className="text-[11px] text-slate-400">
          <div>{baselineLabel}</div>
          <div>
            <span className="text-slate-500">Changes: </span>
            <span className="text-slate-300">{changeSummary}</span>
          </div>
          {diff.deletedTables.length > 0 && (
            <div className="mt-1 text-amber-300">
              You will be asked whether to include DROP TABLE for:{" "}
              <span className="font-mono">
                {diff.deletedTables.map((t) => t.name).join(", ")}
              </span>
            </div>
          )}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={includeRowHints}
            onChange={(e) => setIncludeRowHints(e.target.checked)}
          />
          Include row-count / bloat comments above CREATE TABLE
        </label>
        <div className="space-y-1">
          {DIALECTS.map((d) => (
            <div
              key={d}
              className="flex flex-wrap items-center gap-2 rounded bg-slate-900/50 px-2 py-1"
            >
              <span
                className="w-28 shrink-0 text-xs font-medium text-slate-300"
                title={dialectLabel(d)}
              >
                {SHORT_LABEL[d]}
              </span>
              <button
                type="button"
                className="rounded bg-slate-800 px-2.5 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
                onClick={() => void copySql(d)}
              >
                Copy
              </button>
              <button
                type="button"
                className="rounded border border-sky-800/60 bg-sky-950/40 px-2.5 py-1 text-[11px] text-sky-100 hover:bg-sky-900/50"
                onClick={() => downloadSql(d)}
              >
                Download .sql
              </button>
            </div>
          ))}
        </div>
        <details className="rounded border border-slate-700 bg-slate-950/50">
          <summary className="cursor-pointer px-2 py-1.5 text-[11px] text-slate-400">
            Preview (PostgreSQL, DROP omitted)
          </summary>
          <pre className="max-h-52 overflow-auto p-2 text-[10px] text-slate-400">
            {preview.sql.slice(0, 4000)}
            {preview.sql.length > 4000 ? "\n…" : ""}
          </pre>
        </details>
      </div>

      <details className="rounded border border-slate-700 bg-slate-950/50">
        <summary className="cursor-pointer px-2 py-1.5 text-xs text-slate-400">
          Preview JSON (truncated in UI)
        </summary>
        <pre className="max-h-40 overflow-auto p-2 text-[10px] text-slate-500">
          {json.slice(0, 4000)}
          {json.length > 4000 ? "\n…" : ""}
        </pre>
      </details>
    </div>
  );
}
