import { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Check,
  X,
  Pencil,
  Link2,
  Link2Off,
  AlertTriangle,
} from "lucide-react";
import { useAppStore } from "@/state/store";
import { rowCountPercentiles } from "@/scene/tableScale";
import type { Column, ForeignKeyRef } from "@/model/schema";
import { LearnLink } from "./LearnLink";

const COMMON_TYPES = [
  "integer",
  "bigint",
  "serial",
  "bigserial",
  "uuid",
  "text",
  "varchar(255)",
  "boolean",
  "timestamptz",
  "timestamp",
  "date",
  "jsonb",
  "numeric",
  "decimal(10,2)",
  "float8",
];

export function TablePanel() {
  const schema = useAppStore((s) => s.schema);
  const rawSchema = useAppStore((s) => s.rawSchema);
  const selectedTable = useAppStore((s) => s.selectedTable);
  const setSelectedTable = useAppStore((s) => s.setSelectedTable);
  const setRowCount = useAppStore((s) => s.setRowCount);
  const createTable = useAppStore((s) => s.createTable);
  const deleteTable = useAppStore((s) => s.deleteTable);
  const renameTable = useAppStore((s) => s.renameTable);
  const addColumn = useAppStore((s) => s.addColumn);
  const setSidebarTab = useAppStore((s) => s.setSidebarTab);
  const schemaDirty = useAppStore((s) => s.schemaDirty);
  const proposalSchema = useAppStore((s) => s.proposalSchema);

  const [newTableName, setNewTableName] = useState("");
  const [newTableError, setNewTableError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  const handleCreateTable = () => {
    setNewTableError(null);
    const r = createTable(newTableName);
    if (!r.ok) {
      setNewTableError(r.error ?? "Failed to create table.");
      return;
    }
    setNewTableName("");
  };

  const beginRename = (name: string) => {
    setRenaming(name);
    setRenameValue(name);
    setRenameError(null);
  };

  const commitRename = () => {
    if (!renaming) return;
    const r = renameTable(renaming, renameValue);
    if (!r.ok) {
      setRenameError(r.error ?? "Failed to rename.");
      return;
    }
    setRenaming(null);
    setRenameError(null);
  };

  if (proposalSchema) {
    return (
      <div className="space-y-3 p-4 text-sm text-slate-300">
        <p className="font-medium text-slate-100">Agent proposal is active</p>
        <p className="text-xs leading-relaxed text-slate-400">
          The 3D view shows the proposed schema. Accept or dismiss it in the
          Agent tab before editing tables here (editing would dismiss the
          preview).
        </p>
        <button
          type="button"
          className="rounded border border-amber-700/60 bg-amber-950/50 px-3 py-2 text-xs font-medium text-amber-100 hover:bg-amber-900/40"
          onClick={() => setSidebarTab("agent")}
        >
          Open Agent tab
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 text-sm">
      {schemaDirty && (
        <div className="flex items-start gap-2 rounded border border-amber-700/40 bg-amber-950/40 p-2 text-[11px] text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-amber-100">Unsaved schema changes</p>
            <p className="text-amber-200/80">
              Download the updated schema to keep your edits outside this
              browser.
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded border border-amber-700/60 px-2 py-0.5 text-[11px] text-amber-100 hover:bg-amber-900/40"
            onClick={() => setSidebarTab("export")}
          >
            Go to Export
          </button>
        </div>
      )}

      {/* Tables list + add */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Tables{schema ? ` (${schema.tables.length})` : ""}
          </span>
          <LearnLink topic="createTable" label="CREATE TABLE" />
        </div>
        <div className="mb-2 flex gap-1">
          <input
            type="text"
            className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-xs text-slate-200 focus:border-sky-600 focus:outline-none"
            placeholder="new_table_name"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateTable();
            }}
          />
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1 rounded bg-sky-700/50 px-2 text-xs text-sky-100 hover:bg-sky-700/70 disabled:opacity-50"
            onClick={handleCreateTable}
            disabled={!newTableName.trim()}
            title="Add table"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
        {newTableError && (
          <p className="mb-1 text-[11px] text-rose-400">{newTableError}</p>
        )}

        {schema && schema.tables.length > 0 ? (
          <ul className="max-h-40 space-y-0.5 overflow-y-auto rounded border border-slate-800 bg-slate-950/60 p-1">
            {schema.tables.map((t) => (
              <li
                key={t.name}
                className={
                  "flex items-center gap-1 rounded px-1.5 py-1 text-xs " +
                  (t.name === selectedTable
                    ? "bg-sky-900/40 text-sky-100"
                    : "text-slate-300 hover:bg-slate-800/60")
                }
              >
                <button
                  type="button"
                  className="flex-1 truncate text-left"
                  onClick={() => setSelectedTable(t.name)}
                  title={`${t.columns.length} columns`}
                >
                  <span className="font-mono">{t.name}</span>
                  <span className="ml-2 text-[10px] text-slate-500">
                    {t.columns.length} cols
                    {t.rowCount != null
                      ? ` · ${t.rowCount.toLocaleString()} rows`
                      : ""}
                  </span>
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-slate-500 hover:bg-slate-700 hover:text-slate-200"
                  onClick={() => {
                    if (
                      confirm(
                        `Delete table "${t.name}"? This also clears foreign keys referencing it.`
                      )
                    )
                      deleteTable(t.name);
                  }}
                  title="Delete table"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded border border-dashed border-slate-700 px-2 py-3 text-center text-[11px] text-slate-500">
            No tables yet. Add one above or{" "}
            <button
              type="button"
              className="text-sky-400 hover:underline"
              onClick={() => setSidebarTab("import")}
            >
              import a schema
            </button>
            .
          </p>
        )}
      </div>

      {/* Selected table editor */}
      {schema && selectedTable && (
        <SelectedTableEditor
          key={selectedTable}
          tableName={selectedTable}
          renaming={renaming === selectedTable}
          renameValue={renameValue}
          renameError={renameError}
          onBeginRename={() => beginRename(selectedTable)}
          onRenameChange={setRenameValue}
          onRenameCommit={commitRename}
          onRenameCancel={() => {
            setRenaming(null);
            setRenameError(null);
          }}
          setRowCount={setRowCount}
          addColumn={addColumn}
          rawRowCount={
            rawSchema?.tables.find((t) => t.name === selectedTable)?.rowCount
          }
        />
      )}

      {!selectedTable && schema && schema.tables.length > 0 && (
        <p className="rounded border border-dashed border-slate-700 px-2 py-3 text-center text-[11px] text-slate-500">
          Select a table above or click one in the 3D view to edit its columns,
          keys, and size.
        </p>
      )}
    </div>
  );
}

type EditorProps = {
  tableName: string;
  renaming: boolean;
  renameValue: string;
  renameError: string | null;
  onBeginRename: () => void;
  onRenameChange: (v: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  setRowCount: (t: string, c: number | undefined) => void;
  addColumn: ReturnType<typeof useAppStore.getState>["addColumn"];
  rawRowCount: number | undefined;
};

function SelectedTableEditor({
  tableName,
  renaming,
  renameValue,
  renameError,
  onBeginRename,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
  setRowCount,
  addColumn,
  rawRowCount,
}: EditorProps) {
  const schema = useAppStore((s) => s.schema);
  const table = useMemo(
    () => schema?.tables.find((t) => t.name === tableName),
    [schema, tableName]
  );

  const [adding, setAdding] = useState(false);
  const [newCol, setNewCol] = useState<Partial<Column> & { name: string }>({
    name: "",
    type: "text",
    primaryKey: false,
    nullable: true,
    indexed: false,
  });
  const [addError, setAddError] = useState<string | null>(null);

  const { p95, p99 } = useMemo(
    () => (schema ? rowCountPercentiles(schema) : { p95: 0, p99: 0 }),
    [schema]
  );

  if (!table) return null;

  const rc = table.rowCount ?? 0;
  let bloatLabel = "n/a";
  if (rc > 0) {
    if (rc >= p99) bloatLabel = "very high (≥p99)";
    else if (rc >= p95) bloatLabel = "high (≥p95)";
    else bloatLabel = "typical";
  }

  const handleAdd = () => {
    setAddError(null);
    const r = addColumn(tableName, newCol);
    if (!r.ok) {
      setAddError(r.error ?? "Failed to add column.");
      return;
    }
    setNewCol({
      name: "",
      type: "text",
      primaryKey: false,
      nullable: true,
      indexed: false,
    });
    setAdding(false);
  };

  return (
    <div className="space-y-3 border-t border-slate-800 pt-3">
      {/* Table name + rename */}
      <div>
        <label className="mb-1 block text-xs text-slate-400">Table name</label>
        {renaming ? (
          <div className="space-y-1">
            <div className="flex gap-1">
              <input
                autoFocus
                type="text"
                className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 font-mono text-xs text-slate-200"
                value={renameValue}
                onChange={(e) => onRenameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onRenameCommit();
                  else if (e.key === "Escape") onRenameCancel();
                }}
              />
              <button
                type="button"
                className="rounded bg-emerald-700/50 px-2 text-xs text-emerald-100 hover:bg-emerald-700/70"
                onClick={onRenameCommit}
                title="Save"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="rounded border border-slate-700 px-2 text-xs text-slate-300 hover:bg-slate-800"
                onClick={onRenameCancel}
                title="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {renameError && (
              <p className="text-[11px] text-rose-400">{renameError}</p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="flex-1 truncate rounded border border-slate-800 bg-slate-950 px-2 py-1 font-mono text-xs text-slate-200">
              {table.name}
            </span>
            <button
              type="button"
              className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              onClick={onBeginRename}
              title="Rename table"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Row count */}
      <div>
        <label className="mb-1 block text-xs text-slate-400">
          Row count (controls 3D size)
        </label>
        <div className="flex gap-1">
          <input
            type="number"
            min={0}
            className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 font-mono text-xs text-slate-200"
            value={table.rowCount ?? ""}
            placeholder="unknown"
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") {
                setRowCount(table.name, undefined);
                return;
              }
              const n = Number(v);
              if (!Number.isNaN(n)) setRowCount(table.name, n);
            }}
          />
          <button
            type="button"
            className="shrink-0 rounded border border-slate-600 px-2 text-xs text-slate-400 hover:bg-slate-800"
            onClick={() => setRowCount(table.name, undefined)}
            title="Use imported value"
          >
            Reset
          </button>
        </div>
        {rawRowCount != null && (
          <p className="mt-1 text-[11px] text-slate-500">
            Imported: {rawRowCount.toLocaleString()}
          </p>
        )}
        <p className="mt-1 text-[11px] text-slate-500">
          Bloat (vs this schema):{" "}
          <span className="text-slate-300">{bloatLabel}</span>
        </p>
      </div>

      {/* Columns editor */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Columns ({table.columns.length})
          </span>
          <LearnLink topic="dataTypes" label="Data types" />
        </div>
        <datalist id="col-types">
          {COMMON_TYPES.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <div className="space-y-1">
          {table.columns.map((c) => (
            <ColumnRow key={c.name} tableName={tableName} column={c} />
          ))}
        </div>

        {adding ? (
          <div className="mt-2 space-y-1 rounded border border-sky-800/50 bg-sky-950/20 p-2">
            <div className="flex flex-wrap gap-1">
              <input
                autoFocus
                type="text"
                placeholder="column_name"
                className="min-w-[8rem] flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-xs text-slate-200"
                value={newCol.name}
                onChange={(e) =>
                  setNewCol((s) => ({ ...s, name: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
              />
              <input
                type="text"
                list="col-types"
                placeholder="type"
                className="w-28 rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-xs text-slate-200"
                value={newCol.type ?? ""}
                onChange={(e) =>
                  setNewCol((s) => ({ ...s, type: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
              <label className="inline-flex cursor-pointer items-center gap-1">
                <input
                  type="checkbox"
                  checked={!!newCol.primaryKey}
                  onChange={(e) =>
                    setNewCol((s) => ({
                      ...s,
                      primaryKey: e.target.checked,
                      nullable: e.target.checked ? false : s.nullable,
                    }))
                  }
                />
                PK
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1">
                <input
                  type="checkbox"
                  checked={newCol.nullable === false}
                  onChange={(e) =>
                    setNewCol((s) => ({
                      ...s,
                      nullable: e.target.checked ? false : true,
                    }))
                  }
                />
                NOT NULL
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1">
                <input
                  type="checkbox"
                  checked={!!newCol.indexed}
                  onChange={(e) =>
                    setNewCol((s) => ({ ...s, indexed: e.target.checked }))
                  }
                />
                indexed
              </label>
            </div>
            {addError && (
              <p className="text-[11px] text-rose-400">{addError}</p>
            )}
            <div className="flex gap-1">
              <button
                type="button"
                className="rounded bg-emerald-700/50 px-2 py-1 text-xs text-emerald-100 hover:bg-emerald-700/70 disabled:opacity-50"
                onClick={handleAdd}
                disabled={!newCol.name.trim()}
              >
                Add column
              </button>
              <button
                type="button"
                className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                onClick={() => {
                  setAdding(false);
                  setAddError(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add column
          </button>
        )}
      </div>
    </div>
  );
}

type ColRowProps = {
  tableName: string;
  column: Column;
};

function ColumnRow({ tableName, column }: ColRowProps) {
  const schema = useAppStore((s) => s.schema);
  const updateColumn = useAppStore((s) => s.updateColumn);
  const deleteColumn = useAppStore((s) => s.deleteColumn);
  const setForeignKey = useAppStore((s) => s.setForeignKey);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Column>(column);
  const [rowError, setRowError] = useState<string | null>(null);
  const [fkEditing, setFkEditing] = useState(false);
  const [fkDraft, setFkDraft] = useState<ForeignKeyRef | null>(
    column.foreignKey ?? null
  );

  const availableTables = useMemo(
    () => schema?.tables.filter((t) => t.name !== tableName) ?? [],
    [schema, tableName]
  );
  const fkTargetCols = useMemo(() => {
    if (!fkDraft?.table) return [];
    return schema?.tables.find((t) => t.name === fkDraft.table)?.columns ?? [];
  }, [schema, fkDraft?.table]);

  const startEdit = () => {
    setDraft(column);
    setRowError(null);
    setEditing(true);
  };

  const commit = () => {
    setRowError(null);
    const r = updateColumn(tableName, column.name, {
      name: draft.name,
      type: draft.type,
      primaryKey: draft.primaryKey,
      nullable: draft.nullable,
      indexed: draft.indexed,
    });
    if (!r.ok) {
      setRowError(r.error ?? "Update failed.");
      return;
    }
    setEditing(false);
  };

  const startFk = () => {
    setFkDraft(column.foreignKey ?? null);
    setFkEditing(true);
  };

  const commitFk = () => {
    if (fkDraft && fkDraft.table && fkDraft.column) {
      setForeignKey(tableName, column.name, fkDraft);
    } else {
      setForeignKey(tableName, column.name, null);
    }
    setFkEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-1 rounded border border-sky-800/50 bg-sky-950/20 p-2">
        <div className="flex flex-wrap gap-1">
          <input
            autoFocus
            type="text"
            className="min-w-[8rem] flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-xs text-slate-200"
            value={draft.name}
            onChange={(e) => setDraft((s) => ({ ...s, name: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              else if (e.key === "Escape") setEditing(false);
            }}
          />
          <input
            type="text"
            list="col-types"
            className="w-28 rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-xs text-slate-200"
            value={draft.type}
            onChange={(e) => setDraft((s) => ({ ...s, type: e.target.value }))}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
          <label className="inline-flex cursor-pointer items-center gap-1">
            <input
              type="checkbox"
              checked={!!draft.primaryKey}
              onChange={(e) =>
                setDraft((s) => ({
                  ...s,
                  primaryKey: e.target.checked,
                  nullable: e.target.checked ? false : s.nullable,
                }))
              }
            />
            PK
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1">
            <input
              type="checkbox"
              checked={draft.nullable === false}
              onChange={(e) =>
                setDraft((s) => ({
                  ...s,
                  nullable: e.target.checked ? false : true,
                }))
              }
            />
            NOT NULL
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1">
            <input
              type="checkbox"
              checked={!!draft.indexed}
              onChange={(e) =>
                setDraft((s) => ({ ...s, indexed: e.target.checked }))
              }
            />
            indexed
          </label>
        </div>
        {rowError && <p className="text-[11px] text-rose-400">{rowError}</p>}
        <div className="flex gap-1">
          <button
            type="button"
            className="rounded bg-emerald-700/50 px-2 py-1 text-xs text-emerald-100 hover:bg-emerald-700/70"
            onClick={commit}
          >
            Save
          </button>
          <button
            type="button"
            className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded border border-slate-800 bg-slate-950/60 px-2 py-1 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className="font-mono text-sky-300 hover:underline"
          onClick={startEdit}
          title="Edit column"
        >
          {column.name}
        </button>
        <span className="text-slate-500">{column.type}</span>
        {column.primaryKey && (
          <span
            className="rounded bg-amber-900/50 px-1 text-[10px] text-amber-200"
            title="PRIMARY KEY"
          >
            PK
          </span>
        )}
        {column.nullable === false && (
          <span
            className="rounded bg-slate-800 px-1 text-[10px] text-slate-300"
            title="NOT NULL"
          >
            NOT NULL
          </span>
        )}
        {column.indexed && (
          <span
            className="rounded bg-emerald-900/40 px-1 text-[10px] text-emerald-200"
            title="indexed"
          >
            IX
          </span>
        )}
        {column.foreignKey && (
          <button
            type="button"
            className="rounded bg-sky-900/40 px-1 text-[10px] text-sky-200 hover:bg-sky-800/60"
            onClick={startFk}
            title="Edit foreign key"
          >
            →{column.foreignKey.table}.{column.foreignKey.column}
          </button>
        )}
        <span className="flex-1" />
        <button
          type="button"
          className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-sky-300"
          onClick={startFk}
          title={column.foreignKey ? "Edit foreign key" : "Add foreign key"}
        >
          {column.foreignKey ? (
            <Link2 className="h-3 w-3" />
          ) : (
            <Link2Off className="h-3 w-3" />
          )}
        </button>
        <button
          type="button"
          className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
          onClick={startEdit}
          title="Edit column"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          type="button"
          className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-rose-400"
          onClick={() => {
            if (confirm(`Delete column "${column.name}"?`))
              deleteColumn(tableName, column.name);
          }}
          title="Delete column"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {fkEditing && (
        <div className="mt-1 space-y-1 rounded border border-sky-800/40 bg-slate-950 p-2">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">
            Foreign key target
          </div>
          <div className="flex flex-wrap gap-1">
            <select
              className="rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-xs text-slate-200"
              value={fkDraft?.table ?? ""}
              onChange={(e) => {
                const t = e.target.value;
                setFkDraft(
                  t ? { table: t, column: "" } : null
                );
              }}
            >
              <option value="">— none —</option>
              {availableTables.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              className="rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-xs text-slate-200 disabled:opacity-50"
              value={fkDraft?.column ?? ""}
              onChange={(e) =>
                setFkDraft((s) =>
                  s ? { ...s, column: e.target.value } : s
                )
              }
              disabled={!fkDraft?.table}
            >
              <option value="">— column —</option>
              {fkTargetCols.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                  {c.primaryKey ? " (PK)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              className="rounded bg-emerald-700/50 px-2 py-0.5 text-xs text-emerald-100 hover:bg-emerald-700/70 disabled:opacity-50"
              onClick={commitFk}
              disabled={
                !!fkDraft && !!fkDraft.table && !fkDraft.column
              }
              title="Apply foreign key"
            >
              Save FK
            </button>
            {column.foreignKey && (
              <button
                type="button"
                className="rounded border border-rose-800/60 px-2 py-0.5 text-xs text-rose-200 hover:bg-rose-900/40"
                onClick={() => {
                  setForeignKey(tableName, column.name, null);
                  setFkEditing(false);
                }}
              >
                Clear
              </button>
            )}
            <button
              type="button"
              className="rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-800"
              onClick={() => setFkEditing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
