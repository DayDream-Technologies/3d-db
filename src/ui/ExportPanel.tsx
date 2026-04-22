import { useAppStore } from "@/state/store";
import { toAgentJson } from "@/export/toAgentJson";
import { toMarkdown } from "@/export/toMarkdown";

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

  if (!schema) {
    return (
      <div className="p-3 text-sm text-slate-500">Nothing to export yet.</div>
    );
  }

  const json = toAgentJson(schema, tips, selectedTable);
  const md = toMarkdown(schema, tips, selectedTable);
  const base = schema.name.replace(/\s+/g, "_").slice(0, 40);

  return (
    <div className="space-y-3 p-3 text-sm">
      <p className="text-xs leading-relaxed text-slate-500">
        Structured exports for LLMs: paste into chats or version-control alongside
        migrations.
      </p>
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
            download(`${base}_schema.md`, md, "text/markdown;charset=utf-8")
          }
        >
          Download Markdown
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
