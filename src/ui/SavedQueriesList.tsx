import { useAppStore } from "@/state/store";
import { generateSql } from "@/query/generateSql";
import { Trash2, Copy, Download, Upload, FolderInput } from "lucide-react";
import type { QueryModel } from "@/model/query";

function download(name: string, content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function SavedQueriesList() {
  const list = useAppStore((s) => s.savedQueries);
  const load = useAppStore((s) => s.loadSavedQuery);
  const dup = useAppStore((s) => s.duplicateSavedQuery);
  const del = useAppStore((s) => s.deleteSavedQuery);
  const exportJson = useAppStore((s) => s.exportSavedQueriesAsJson);
  const merge = useAppStore((s) => s.importSavedQueriesMerge);
  const schema = useAppStore((s) => s.schema);

  const refTables = (q: QueryModel) => {
    const u = new Set<string>();
    const w = (t: { kind: string; name?: string; query?: unknown }) => {
      if (t?.kind === "table" && t.name) u.add(t.name);
    };
    w(q.from as { kind: string; name?: string });
    (q.joins ?? []).forEach((j) => w(j.from as { kind: string; name?: string }));
    return [...u].sort().join(", ");
  };

  return (
    <div className="space-y-3 text-sm">
      {list.length === 0 && (
        <p className="text-xs text-slate-500">
          No saved queries yet. Use the <strong>Builder</strong> tab, then
          &quot;Save to list&quot; or &quot;Save&quot;.
        </p>
      )}
      <ul className="max-h-64 space-y-2 overflow-y-auto">
        {list.map((q) => (
          <li
            key={q.id}
            className="rounded border border-slate-700/80 bg-slate-950/60 p-2 text-xs"
          >
            <div className="font-medium text-slate-200">{q.name}</div>
            <div className="text-[10px] text-slate-500">
              {refTables(q) || "(tables)"} · {new Date(q.updatedAt).toLocaleString()}
            </div>
            {q.notes && (
              <p className="mt-0.5 text-[10px] text-slate-500">{q.notes}</p>
            )}
            <div className="mt-1 flex flex-wrap gap-1">
              <button
                type="button"
                className="rounded border border-slate-600 px-1.5 py-0.5 text-[10px] text-sky-300 hover:bg-slate-800"
                onClick={() => {
                  load(q.id);
                }}
              >
                Load
              </button>
              <button
                type="button"
                className="rounded border border-slate-600 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800"
                onClick={() => dup(q.id)}
              >
                Duplicate
              </button>
              <button
                type="button"
                className="rounded border border-slate-600 p-0.5 text-slate-400 hover:bg-slate-800"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(generateSql(q))
                    .then(
                      () => undefined,
                      () => alert("Copy failed")
                    )
                }
                title="Copy SQL"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="rounded border border-slate-600 p-0.5 text-slate-400 hover:bg-slate-800"
                onClick={() =>
                  download(
                    `query_${q.name.replace(/\W+/g, "_").slice(0, 32)}.json`,
                    JSON.stringify(
                      { version: 1, queries: [q] },
                      null,
                      2
                    )
                  )
                }
                title="Download this query as JSON"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="ml-auto text-red-400/90 hover:text-red-300"
                onClick={() => {
                  if (confirm(`Delete &quot;${q.name}&quot;?`)) del(q.id);
                }}
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-2 text-[10px]">
        <button
          type="button"
          className="flex items-center gap-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-200 hover:bg-slate-700"
          onClick={() => download("saved_queries.json", exportJson())}
        >
          <FolderInput className="h-3 w-3" />
          Export all (.json)
        </button>
        <label className="flex cursor-pointer items-center gap-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-200 hover:bg-slate-700">
          <Upload className="h-3 w-3" />
          Import
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              const r = new FileReader();
              r.onload = () => {
                const text = typeof r.result === "string" ? r.result : "";
                try {
                  const data = JSON.parse(text) as { queries?: QueryModel[] } | null;
                  if (data && Array.isArray(data.queries)) {
                    merge(data.queries);
                    alert(`Imported ${data.queries.length} query(s).`);
                    return;
                  }
                  alert('Expected a JSON file with a top-level "queries" array');
                } catch {
                  alert("Invalid JSON");
                }
              };
              r.readAsText(f);
            }}
          />
        </label>
        {schema && (
          <span className="self-center text-slate-500">
            Schema: {schema.name} ({schema.tables.length} tables)
          </span>
        )}
      </div>
    </div>
  );
}
