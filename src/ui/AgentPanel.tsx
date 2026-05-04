import { useMemo, useState } from "react";
import { useAppStore } from "@/state/store";
import { diffSchema, hasSchemaChanges } from "@/export/schemaDiff";
import { toExtendedSchemaJsonString } from "@/export/schemaFileJson";
import { FileJson, Loader2 } from "lucide-react";

function baselineFetchUrl(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}/__agent__/baseline`;
}

export function AgentPanel() {
  const proposalSchema = useAppStore((s) => s.proposalSchema);
  const proposalMeta = useAppStore((s) => s.proposalMeta);
  const importedSchema = useAppStore((s) => s.importedSchema);
  const dismissProposal = useAppStore((s) => s.dismissProposal);
  const acceptProposal = useAppStore((s) => s.acceptProposal);
  const applyProposalPreviewFromText = useAppStore(
    (s) => s.applyProposalPreviewFromText
  );
  const setSidebarTab = useAppStore((s) => s.setSidebarTab);
  const setImportMode = useAppStore((s) => s.setImportMode);
  const setImportText = useAppStore((s) => s.setImportText);
  const applyImport = useAppStore((s) => s.applyImport);

  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"load" | "accept" | null>(null);
  const [syncDisk, setSyncDisk] = useState(true);

  const diff = useMemo(() => {
    if (!proposalSchema) return null;
    return diffSchema(importedSchema, proposalSchema);
  }, [importedSchema, proposalSchema]);

  const loadWorkspaceBaseline = async () => {
    setBusy("load");
    setWorkspaceError(null);
    try {
      const res = await fetch(baselineFetchUrl());
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? `HTTP ${res.status}`
        );
      }
      const text = await res.text();
      setImportMode("json");
      setImportText(text);
      applyImport();
      setSidebarTab("import");
    } catch (e) {
      setWorkspaceError(
        e instanceof Error ? e.message : "Failed to load workspace baseline"
      );
    } finally {
      setBusy(null);
    }
  };

  const previewFromPaste = () => {
    setPasteError(null);
    try {
      applyProposalPreviewFromText(pasteText, {
        source: "ui",
        receivedAt: new Date().toISOString(),
      });
      setSidebarTab("agent");
    } catch (e) {
      setPasteError(
        e instanceof Error ? e.message : "Invalid JSON or schema format"
      );
    }
  };

  const onAccept = async () => {
    if (!proposalSchema) return;
    if (
      !window.confirm(
        "Accept this proposal as the new schema? The current import baseline will be replaced."
      )
    ) {
      return;
    }
    acceptProposal();
    if (import.meta.env.DEV && syncDisk) {
      setBusy("accept");
      try {
        const {
          schema: accepted,
          savedQueries: sq,
          includeQueriesInExport: inc,
        } = useAppStore.getState();
        if (!accepted) return;
        const body = toExtendedSchemaJsonString(accepted, {
          includeQueries: inc,
          savedQueries: sq,
        });
        const res = await fetch(baselineFetchUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        if (!res.ok) {
          const t = await res.text();
          console.warn("Workspace baseline sync failed:", t);
        }
      } catch (e) {
        console.warn("Workspace baseline sync failed:", e);
      } finally {
        setBusy(null);
      }
    }
  };

  return (
    <div className="space-y-4 p-3 text-sm text-slate-200">
      <div>
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Agent proposal
        </h2>
        <p className="text-xs leading-relaxed text-slate-400">
          Preview schema changes from an LLM or MCP without changing the{" "}
          <strong className="text-slate-300">accepted baseline</strong> until
          you accept. Use the{" "}
          <strong className="text-slate-300">Export</strong> tab for migration
          SQL (baseline → proposal) to run on test or production databases.
        </p>
      </div>

      <div className="rounded border border-slate-700/80 bg-slate-900/50 p-2">
        <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
          Workspace file (dev)
        </div>
        <p className="mb-2 text-[11px] text-slate-500">
          Gitignored:{" "}
          <code className="text-slate-400">.3d-db-workspace/baseline.schema.json</code>
        </p>
        {import.meta.env.DEV ? (
          <button
            type="button"
            disabled={busy === "load"}
            className="flex w-full items-center justify-center gap-1 rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            onClick={() => void loadWorkspaceBaseline()}
          >
            {busy === "load" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileJson className="h-3.5 w-3.5" />
            )}
            Load workspace baseline
          </button>
        ) : (
          <p className="text-[11px] text-slate-500">
            Workspace load/sync is only available in local dev (
            <code className="text-slate-400">npm run dev</code>).
          </p>
        )}
        {workspaceError && (
          <p className="mt-2 text-xs text-amber-400">{workspaceError}</p>
        )}
      </div>

      <div className="rounded border border-slate-700/80 bg-slate-900/50 p-2">
        <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
          Preview from JSON text
        </div>
        <textarea
          className="mb-2 h-28 w-full resize-y rounded border border-slate-600 bg-slate-950/80 p-2 font-mono text-[11px] text-slate-200 placeholder:text-slate-600"
          placeholder='{ "name": "...", "tables": [...] }'
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
        />
        <button
          type="button"
          className="w-full rounded border border-sky-700/60 bg-sky-900/40 px-2 py-1.5 text-xs text-sky-100 hover:bg-sky-900/60"
          onClick={previewFromPaste}
        >
          Preview as proposal
        </button>
        {pasteError && proposalSchema && (
          <p className="mt-2 text-xs text-amber-400">{pasteError}</p>
        )}
      </div>

      {!proposalSchema && (
        <p className="text-xs text-slate-500">
          No active proposal. Use{" "}
          <strong className="text-slate-400">preview_schema_proposal</strong>{" "}
          from the MCP server, or paste JSON above.
        </p>
      )}

      {proposalSchema && diff && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="rounded bg-amber-900/40 px-1.5 py-0.5 text-amber-200">
              Previewing
            </span>
            {proposalMeta && (
              <span>
                {proposalMeta.source} ·{" "}
                {new Date(proposalMeta.receivedAt).toLocaleString()}
              </span>
            )}
          </div>

          {hasSchemaChanges(diff) ? (
            <p className="text-xs text-slate-300">
              {diff.newTables.length} new · {diff.modifiedTables.length} modified
              · {diff.deletedTables.length} removed (vs accepted baseline)
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Proposal matches baseline structure (no migration SQL needed).
            </p>
          )}

          {diff.newTables.length > 0 && (
            <div>
              <div className="mb-0.5 text-[10px] font-medium uppercase text-emerald-400/90">
                New tables
              </div>
              <ul className="list-inside list-disc text-xs text-slate-300">
                {diff.newTables.map((t) => (
                  <li key={t.name}>{t.name}</li>
                ))}
              </ul>
            </div>
          )}

          {diff.modifiedTables.length > 0 && (
            <div>
              <div className="mb-0.5 text-[10px] font-medium uppercase text-amber-400/90">
                Modified tables
              </div>
              <ul className="list-inside list-disc text-xs text-slate-300">
                {diff.modifiedTables.map((d) => (
                  <li key={d.name}>{d.name}</li>
                ))}
              </ul>
            </div>
          )}

          {diff.deletedTables.length > 0 && (
            <div>
              <div className="mb-0.5 text-[10px] font-medium uppercase text-rose-400/90">
                Removed from proposal (still in baseline)
              </div>
              <ul className="list-inside list-disc text-xs text-slate-300">
                {diff.deletedTables.map((t) => (
                  <li key={t.name}>{t.name}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-slate-700/80 pt-3">
            <button
              type="button"
              className="rounded border border-sky-700/60 bg-sky-900/40 px-2 py-2 text-xs font-medium text-sky-100 hover:bg-sky-900/60"
              onClick={() => setSidebarTab("export")}
            >
              View migration SQL (Export tab)
            </button>
            {import.meta.env.DEV && (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={syncDisk}
                  onChange={(e) => setSyncDisk(e.target.checked)}
                  className="rounded border-slate-600"
                />
                On Accept, sync accepted schema to{" "}
                <code className="text-slate-500">baseline.schema.json</code>
              </label>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy === "accept"}
                className="flex-1 rounded border border-emerald-800/80 bg-emerald-950/50 px-2 py-2 text-xs font-medium text-emerald-100 hover:bg-emerald-900/40 disabled:opacity-50"
                onClick={() => void onAccept()}
              >
                {busy === "accept" ? "Syncing…" : "Accept proposal"}
              </button>
              <button
                type="button"
                disabled={busy === "accept"}
                className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-2 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                onClick={dismissProposal}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
