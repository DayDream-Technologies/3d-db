import { useAppStore } from "@/state/store";
import { LearnLink } from "./LearnLink";

const base = import.meta.env.BASE_URL;

const DOCS = [
  { label: "Schema JSON format", href: `${base}docs/SCHEMA_FORMAT.md` },
  { label: "Supabase / Postgres", href: `${base}docs/IMPORT_SUPABASE.md` },
  { label: "Postgres", href: `${base}docs/IMPORT_POSTGRES.md` },
  { label: "MySQL", href: `${base}docs/IMPORT_MYSQL.md` },
  { label: "MongoDB", href: `${base}docs/IMPORT_MONGODB.md` },
];

export function ImportPanel() {
  const importMode = useAppStore((s) => s.importMode);
  const importText = useAppStore((s) => s.importText);
  const setImportMode = useAppStore((s) => s.setImportMode);
  const setImportText = useAppStore((s) => s.setImportText);
  const applyImport = useAppStore((s) => s.applyImport);
  const loadSample = useAppStore((s) => s.loadSample);

  return (
    <div className="space-y-3 p-3 text-sm">
      <div className="flex gap-2">
        <button
          type="button"
          className={`flex-1 rounded px-2 py-1.5 text-xs font-medium ${
            importMode === "json"
              ? "bg-sky-700 text-white"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
          onClick={() => setImportMode("json")}
        >
          JSON
        </button>
        <button
          type="button"
          className={`flex-1 rounded px-2 py-1.5 text-xs font-medium ${
            importMode === "sql"
              ? "bg-sky-700 text-white"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
          onClick={() => setImportMode("sql")}
        >
          SQL (DDL)
        </button>
      </div>
      <textarea
        className="h-48 w-full resize-y rounded border border-slate-600 bg-slate-950 p-2 font-mono text-xs text-slate-200 placeholder:text-slate-600"
        placeholder={
          importMode === "json"
            ? '{ "name": "My DB", "tables": [ ... ] }'
            : "Paste CREATE TABLE statements..."
        }
        value={importText}
        onChange={(e) => setImportText(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500"
          onClick={() => {
            try {
              applyImport();
            } catch (err) {
              alert(err instanceof Error ? err.message : String(err));
            }
          }}
        >
          Visualize
        </button>
        <button
          type="button"
          className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          onClick={() => setImportText("")}
        >
          Clear
        </button>
        <label className="cursor-pointer rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800">
          Upload file
          <input
            type="file"
            accept=".json,.sql,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const r = new FileReader();
              r.onload = () =>
                setImportText(typeof r.result === "string" ? r.result : "");
              r.readAsText(f);
            }}
          />
        </label>
      </div>
      <div className="rounded border border-slate-700 bg-slate-900/60 p-2">
        <div className="mb-1 text-xs font-semibold text-slate-400">
          Quick load samples
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className="rounded bg-slate-800 px-2 py-1 text-[11px] hover:bg-slate-700"
            onClick={() =>
              void loadSample("/samples/ecommerce.json").catch(alert)
            }
          >
            E‑commerce
          </button>
          <button
            type="button"
            className="rounded bg-slate-800 px-2 py-1 text-[11px] hover:bg-slate-700"
            onClick={() => void loadSample("/samples/blog.json").catch(alert)}
          >
            Blog
          </button>
          <button
            type="button"
            className="rounded bg-slate-800 px-2 py-1 text-[11px] hover:bg-slate-700"
            onClick={() =>
              void loadSample("/samples/library.json").catch(alert)
            }
          >
            Library
          </button>
        </div>
      </div>
      <div>
        <div className="mb-1 text-xs font-semibold text-slate-400">
          Import guides (open in repo or dev server)
        </div>
        <ul className="list-inside list-disc space-y-0.5 text-[11px] text-sky-400">
          {DOCS.map((d) => (
            <li key={d.href}>
              <a
                href={d.href}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                {d.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          Markdown guides are in <code className="text-slate-400">public/docs</code>{" "}
          (served here) and mirrored under <code className="text-slate-400">docs/</code>{" "}
          in the repo.
        </p>
      </div>
      <div className="rounded border border-slate-700 bg-slate-900/60 p-2">
        <div className="mb-1 text-xs font-semibold text-slate-400">
          New to SQL? Start here
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
          <LearnLink topic="home" label="SQL Tutorial home" />
          <LearnLink topic="createTable" />
          <LearnLink topic="constraints" />
          <LearnLink topic="dataTypes" />
          <LearnLink topic="primaryKey" />
          <LearnLink topic="foreignKey" />
        </div>
      </div>
    </div>
  );
}
