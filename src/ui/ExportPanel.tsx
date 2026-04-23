import { useAppStore } from "@/state/store";
import { toAgentJson } from "@/export/toAgentJson";
import { toMarkdown } from "@/export/toMarkdown";
import { toExtendedSchemaJsonString } from "@/export/schemaFileJson";

function download(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportPanel() {
  const schema = useAppStore((s) => s.schema);
  const tips = useAppStore((s) => s.tips);
  const selectedTable = useAppStore((s) => s.selectedTable);
  const savedQueries = useAppStore((s) => s.savedQueries);
  const includeQueries = useAppStore((s) => s.includeQueriesInExport);
  const setInclude = useAppStore((s) => s.setIncludeQueriesInExport);
  const schemaDirty = useAppStore((s) => s.schemaDirty);
  const markSchemaSaved = useAppStore((s) => s.markSchemaSaved);

  if (!schema) {
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
