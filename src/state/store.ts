import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Schema, Column, ForeignKeyRef } from "@/model/schema";
import { inferRelationships, mergeRowCounts } from "@/model/schema";
import { computeForceLayout3D, type LayoutMap } from "@/layout/forceLayout";
import { analyzeTips, type Tip } from "@/analysis/tips";
import {
  parseSelectQuery,
  type QueryHighlightResult,
} from "@/analysis/queryHighlight";
import { parseJsonSchemaWithQueries } from "@/parsers/jsonSchema";
import { parseSqlSchema } from "@/parsers/sqlSchema";
import { generateSql } from "@/query/generateSql";
import {
  newEmptyQueryModel,
  newQueryId,
  cloneQueryModel,
  normalizeQueryModel,
  type QueryModel,
} from "@/model/query";

export type SidebarTab =
  | "import"
  | "table"
  | "query"
  | "tips"
  | "export";

export type ImportMode = "json" | "sql";

type AppState = {
  /** Imported schema before row-count overrides (mutated by editor actions) */
  rawSchema: Schema | null;
  /**
   * Frozen snapshot of the schema as originally imported/loaded.
   * Stays untouched across editor mutations - used as the baseline for
   * SQL diff exports. Null when the schema was created from scratch.
   */
  importedSchema: Schema | null;
  /** Merged view for scene / tips / export */
  schema: Schema | null;
  layout: LayoutMap;
  rowCountOverrides: Record<string, number | undefined>;
  selectedTable: string | null;
  hoveredKey: { table: string; column: string } | null;
  sidebarTab: SidebarTab;
  importMode: ImportMode;
  importText: string;
  layoutSeed: number;
  queryText: string;
  queryHighlight: QueryHighlightResult | null;
  tips: Tip[];
  showKeys: boolean;
  /** True when schema has user edits not yet re-exported */
  schemaDirty: boolean;

  /** Query builder + saved (persisted: savedQueries, includeQueriesInExport) */
  builderModel: QueryModel;
  activeQueryId: string | null;
  savedQueries: QueryModel[];
  includeQueriesInExport: boolean;

  /** Practice (Learn) tab — persisted with queries */
  practiceProgress: Record<
    string,
    Record<string, "passed" | "attempted">
  >;
  practiceAnswers: Record<string, Record<string, string>>;

  setImportMode: (m: ImportMode) => void;
  setImportText: (t: string) => void;
  setSidebarTab: (t: SidebarTab) => void;
  setSchema: (s: Schema | null) => void;
  applyImport: () => void;
  loadSample: (url: string) => Promise<void>;
  setRowCount: (table: string, count: number | undefined) => void;
  setSelectedTable: (name: string | null) => void;
  setHoveredKey: (k: { table: string; column: string } | null) => void;
  resetLayout: () => void;
  setQueryText: (q: string) => void;
  runQueryHighlight: () => void;
  clearQueryHighlight: () => void;
  recomputeDerived: () => void;
  setShowKeys: (v: boolean) => void;
  toggleShowKeys: () => void;

  /** Schema editor actions */
  createTable: (name: string) => { ok: boolean; error?: string };
  renameTable: (oldName: string, newName: string) => { ok: boolean; error?: string };
  deleteTable: (name: string) => void;
  addColumn: (
    tableName: string,
    col: Partial<Column> & { name: string }
  ) => { ok: boolean; error?: string };
  updateColumn: (
    tableName: string,
    colName: string,
    patch: Partial<Column>
  ) => { ok: boolean; error?: string };
  deleteColumn: (tableName: string, colName: string) => void;
  setForeignKey: (
    tableName: string,
    colName: string,
    fk: ForeignKeyRef | null
  ) => void;
  markSchemaSaved: () => void;

  setBuilderModel: (m: QueryModel) => void;
  newBuilderQuery: () => void;
  saveCurrentQuery: () => void;
  updateActiveQuery: () => void;
  loadSavedQuery: (id: string) => void;
  deleteSavedQuery: (id: string) => void;
  duplicateSavedQuery: (id: string) => void;
  importSavedQueriesMerge: (queries: QueryModel[]) => void;
  setIncludeQueriesInExport: (v: boolean) => void;
  exportSavedQueriesAsJson: () => string;

  setPracticeStep: (
    lessonId: string,
    stepId: string,
    status: "passed" | "attempted"
  ) => void;
  setPracticeAnswer: (lessonId: string, stepId: string, sql: string) => void;
};

function applyOverrides(
  raw: Schema,
  overrides: Record<string, number | undefined>
): Schema {
  return mergeRowCounts(raw, overrides);
}

function buildLayout(schema: Schema, seed: number): LayoutMap {
  const rels = inferRelationships(schema);
  const nodes = schema.tables.map((t) => t.name);
  const edges: [string, string][] = [];
  for (const r of rels) {
    if (nodes.includes(r.fromTable) && nodes.includes(r.toTable)) {
      edges.push([r.fromTable, r.toTable]);
    }
  }
  if (edges.length === 0 && nodes.length > 1) {
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push([nodes[i], nodes[i + 1]]);
    }
  }
  return computeForceLayout3D(nodes, edges, seed);
}

function isValidIdent(s: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(s);
}

const initialBuilder = (): QueryModel => {
  const m = newEmptyQueryModel({ name: "Untitled" });
  m.notes = "";
  return m;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      rawSchema: null,
      importedSchema: null,
      schema: null,
      layout: {},
      rowCountOverrides: {},
      selectedTable: null,
      hoveredKey: null,
      sidebarTab: "import" as const,
      importMode: "json" as const,
      importText: "",
      layoutSeed: 42,
      queryText: generateSql(initialBuilder()),
      queryHighlight: null,
      tips: [] as Tip[],
      showKeys: true,
      schemaDirty: false,

      builderModel: initialBuilder(),
      activeQueryId: null,
      savedQueries: [] as QueryModel[],
      includeQueriesInExport: true,
      practiceProgress: {} as Record<
        string,
        Record<string, "passed" | "attempted">
      >,
      practiceAnswers: {} as Record<string, Record<string, string>>,

      setImportMode: (m) => set({ importMode: m }),
      setImportText: (t) => set({ importText: t }),
      setSidebarTab: (t) => set({ sidebarTab: t }),
      setSchema: (schema) => {
        if (!schema) {
          set({
            rawSchema: null,
            importedSchema: null,
            schema: null,
            layout: {},
            tips: [],
            selectedTable: null,
            queryHighlight: null,
          });
          return;
        }
        const merged = mergeRowCounts(schema, get().rowCountOverrides);
        const layout = buildLayout(merged, get().layoutSeed);
        set({
          rawSchema: schema,
          importedSchema: JSON.parse(JSON.stringify(schema)) as Schema,
          schema: merged,
          layout,
          tips: analyzeTips(merged),
          queryHighlight: null,
          schemaDirty: false,
        });
      },

      applyImport: () => {
        const { importText, importMode } = get();
        if (importMode === "json") {
          const { schema: raw, queries } = parseJsonSchemaWithQueries(
            importText
          );
          set({ rowCountOverrides: {}, layoutSeed: 42 });
          const merged = applyOverrides(raw, {});
          const layout = buildLayout(merged, 42);
          get().importSavedQueriesMerge(queries);
          set({
            rawSchema: raw,
            importedSchema: JSON.parse(JSON.stringify(raw)) as Schema,
            schema: merged,
            layout,
            tips: analyzeTips(merged),
            queryHighlight: null,
            sidebarTab: "tips" as const,
            schemaDirty: false,
          });
        } else {
          const raw = parseSqlSchema(importText);
          set({ rowCountOverrides: {}, layoutSeed: 42 });
          const merged = applyOverrides(raw, {});
          const layout = buildLayout(merged, 42);
          set({
            rawSchema: raw,
            importedSchema: JSON.parse(JSON.stringify(raw)) as Schema,
            schema: merged,
            layout,
            tips: analyzeTips(merged),
            queryHighlight: null,
            sidebarTab: "tips" as const,
            schemaDirty: false,
          });
        }
      },

      loadSample: async (url) => {
        const base = import.meta.env.BASE_URL.replace(/\/$/, "");
        const resolved = url.startsWith("/") ? `${base}${url}` : url;
        const res = await fetch(resolved);
        if (!res.ok) throw new Error(`Failed to load ${resolved}`);
        const text = await res.text();
        const { schema: raw, queries } = parseJsonSchemaWithQueries(text);
        set({
          importText: text,
          importMode: "json",
          rowCountOverrides: {},
          layoutSeed: 42,
        });
        get().importSavedQueriesMerge(queries);
        const merged = applyOverrides(raw, {});
        const layout = buildLayout(merged, 42);
        set({
          rawSchema: raw,
          importedSchema: JSON.parse(JSON.stringify(raw)) as Schema,
          schema: merged,
          layout,
          tips: analyzeTips(merged),
          queryHighlight: null,
          sidebarTab: "import" as const,
          schemaDirty: false,
        });
      },

      setRowCount: (table, count) => {
        const raw = get().rawSchema;
        if (!raw) return;
        const nextOverrides = { ...get().rowCountOverrides };
        if (count === undefined) delete nextOverrides[table];
        else nextOverrides[table] = count;
        set({ rowCountOverrides: nextOverrides });
        const merged = applyOverrides(raw, nextOverrides);
        set({
          schema: merged,
          tips: analyzeTips(merged),
          schemaDirty: true,
        });
      },

      setSelectedTable: (name) => set({ selectedTable: name }),
      setHoveredKey: (k) => set({ hoveredKey: k }),

      resetLayout: () => {
        const s = get().schema;
        if (!s) return;
        const seed = (get().layoutSeed + 1) % 100000;
        set({
          layoutSeed: seed,
          layout: buildLayout(s, seed),
        });
      },

      setQueryText: (q) => set({ queryText: q }),

      runQueryHighlight: () => {
        const { queryText, schema } = get();
        if (!schema) {
          set({ queryHighlight: null });
          return;
        }
        const result = parseSelectQuery(queryText, schema);
        set({ queryHighlight: result });
      },

      clearQueryHighlight: () => set({ queryHighlight: null }),

      recomputeDerived: () => {
        const s = get().schema;
        if (!s) return;
        set({ tips: analyzeTips(s) });
      },

      setShowKeys: (v) => set({ showKeys: v }),
      toggleShowKeys: () => set({ showKeys: !get().showKeys }),

      createTable: (rawName) => {
        const name = rawName.trim();
        if (!name) return { ok: false, error: "Name is required." };
        if (!isValidIdent(name))
          return {
            ok: false,
            error: "Use letters, digits, and underscores; must start with a letter or _.",
          };
        const raw = get().rawSchema;
        if (raw && raw.tables.some((t) => t.name === name)) {
          return { ok: false, error: `Table "${name}" already exists.` };
        }
        const newTable = {
          name,
          columns: [
            {
              name: "id",
              type: "integer",
              primaryKey: true,
              nullable: false,
              indexed: true,
            } as Column,
          ],
          rowCount: 0,
        };
        const baseRaw: Schema =
          raw ?? { name: "schema", tables: [] };
        const nextRaw: Schema = {
          ...baseRaw,
          tables: [...baseRaw.tables, newTable],
        };
        const seed = get().layoutSeed;
        const merged = applyOverrides(nextRaw, get().rowCountOverrides);
        set({
          rawSchema: nextRaw,
          schema: merged,
          layout: buildLayout(merged, seed),
          tips: analyzeTips(merged),
          selectedTable: name,
          schemaDirty: true,
        });
        return { ok: true };
      },

      renameTable: (oldName, rawNew) => {
        const newName = rawNew.trim();
        if (!newName) return { ok: false, error: "Name is required." };
        if (!isValidIdent(newName))
          return {
            ok: false,
            error: "Use letters, digits, and underscores; must start with a letter or _.",
          };
        if (oldName === newName) return { ok: true };
        const raw = get().rawSchema;
        if (!raw) return { ok: false, error: "No schema loaded." };
        if (raw.tables.some((t) => t.name === newName))
          return { ok: false, error: `Table "${newName}" already exists.` };
        const nextRaw: Schema = {
          ...raw,
          tables: raw.tables.map((t) => {
            const renamedCols = t.columns.map((c) =>
              c.foreignKey && c.foreignKey.table === oldName
                ? { ...c, foreignKey: { ...c.foreignKey, table: newName } }
                : c
            );
            if (t.name === oldName)
              return { ...t, name: newName, columns: renamedCols };
            return { ...t, columns: renamedCols };
          }),
        };
        const overrides = { ...get().rowCountOverrides };
        if (overrides[oldName] !== undefined) {
          overrides[newName] = overrides[oldName];
          delete overrides[oldName];
        }
        const merged = applyOverrides(nextRaw, overrides);
        set({
          rawSchema: nextRaw,
          rowCountOverrides: overrides,
          schema: merged,
          layout: buildLayout(merged, get().layoutSeed),
          tips: analyzeTips(merged),
          selectedTable:
            get().selectedTable === oldName ? newName : get().selectedTable,
          schemaDirty: true,
        });
        return { ok: true };
      },

      deleteTable: (name) => {
        const raw = get().rawSchema;
        if (!raw) return;
        const nextRaw: Schema = {
          ...raw,
          tables: raw.tables
            .filter((t) => t.name !== name)
            .map((t) => ({
              ...t,
              columns: t.columns.map((c) =>
                c.foreignKey && c.foreignKey.table === name
                  ? { ...c, foreignKey: undefined }
                  : c
              ),
            })),
        };
        const overrides = { ...get().rowCountOverrides };
        delete overrides[name];
        const merged = applyOverrides(nextRaw, overrides);
        set({
          rawSchema: nextRaw,
          rowCountOverrides: overrides,
          schema: merged,
          layout: buildLayout(merged, get().layoutSeed),
          tips: analyzeTips(merged),
          selectedTable:
            get().selectedTable === name ? null : get().selectedTable,
          schemaDirty: true,
        });
      },

      addColumn: (tableName, col) => {
        const name = col.name.trim();
        if (!name) return { ok: false, error: "Name is required." };
        if (!isValidIdent(name))
          return {
            ok: false,
            error: "Use letters, digits, and underscores; must start with a letter or _.",
          };
        const raw = get().rawSchema;
        if (!raw) return { ok: false, error: "No schema loaded." };
        const t = raw.tables.find((x) => x.name === tableName);
        if (!t) return { ok: false, error: "Table not found." };
        if (t.columns.some((c) => c.name === name))
          return { ok: false, error: `Column "${name}" already exists.` };
        const newCol: Column = {
          name,
          type: col.type?.trim() || "text",
          primaryKey: col.primaryKey,
          nullable: col.nullable,
          indexed: col.indexed,
          foreignKey: col.foreignKey,
        };
        const nextRaw: Schema = {
          ...raw,
          tables: raw.tables.map((x) =>
            x.name === tableName
              ? { ...x, columns: [...x.columns, newCol] }
              : x
          ),
        };
        const merged = applyOverrides(nextRaw, get().rowCountOverrides);
        set({
          rawSchema: nextRaw,
          schema: merged,
          tips: analyzeTips(merged),
          schemaDirty: true,
        });
        return { ok: true };
      },

      updateColumn: (tableName, colName, patch) => {
        const raw = get().rawSchema;
        if (!raw) return { ok: false, error: "No schema loaded." };
        const t = raw.tables.find((x) => x.name === tableName);
        if (!t) return { ok: false, error: "Table not found." };
        const col = t.columns.find((c) => c.name === colName);
        if (!col) return { ok: false, error: "Column not found." };
        const newName = patch.name?.trim();
        if (newName !== undefined && newName !== colName) {
          if (!newName) return { ok: false, error: "Name is required." };
          if (!isValidIdent(newName))
            return {
              ok: false,
              error: "Use letters, digits, and underscores; must start with a letter or _.",
            };
          if (t.columns.some((c) => c.name === newName))
            return { ok: false, error: `Column "${newName}" already exists.` };
        }
        const effectiveName = newName ?? colName;
        const merged: Column = {
          ...col,
          ...patch,
          name: effectiveName,
          type: (patch.type ?? col.type)?.trim() || col.type,
        };
        const nextRaw: Schema = {
          ...raw,
          tables: raw.tables.map((x) => {
            const cols = x.columns.map((c) => {
              if (x.name === tableName && c.name === colName) return merged;
              if (
                newName &&
                newName !== colName &&
                c.foreignKey &&
                c.foreignKey.table === tableName &&
                c.foreignKey.column === colName
              ) {
                return {
                  ...c,
                  foreignKey: { ...c.foreignKey, column: newName },
                };
              }
              return c;
            });
            return { ...x, columns: cols };
          }),
        };
        const mergedSchema = applyOverrides(nextRaw, get().rowCountOverrides);
        set({
          rawSchema: nextRaw,
          schema: mergedSchema,
          tips: analyzeTips(mergedSchema),
          schemaDirty: true,
        });
        return { ok: true };
      },

      deleteColumn: (tableName, colName) => {
        const raw = get().rawSchema;
        if (!raw) return;
        const nextRaw: Schema = {
          ...raw,
          tables: raw.tables.map((t) => {
            const cols = t.columns
              .filter((c) => !(t.name === tableName && c.name === colName))
              .map((c) =>
                c.foreignKey &&
                c.foreignKey.table === tableName &&
                c.foreignKey.column === colName
                  ? { ...c, foreignKey: undefined }
                  : c
              );
            return { ...t, columns: cols };
          }),
        };
        const merged = applyOverrides(nextRaw, get().rowCountOverrides);
        set({
          rawSchema: nextRaw,
          schema: merged,
          tips: analyzeTips(merged),
          schemaDirty: true,
        });
      },

      setForeignKey: (tableName, colName, fk) => {
        const raw = get().rawSchema;
        if (!raw) return;
        const nextRaw: Schema = {
          ...raw,
          tables: raw.tables.map((t) =>
            t.name === tableName
              ? {
                  ...t,
                  columns: t.columns.map((c) =>
                    c.name === colName
                      ? { ...c, foreignKey: fk ?? undefined }
                      : c
                  ),
                }
              : t
          ),
        };
        const merged = applyOverrides(nextRaw, get().rowCountOverrides);
        set({
          rawSchema: nextRaw,
          schema: merged,
          layout: buildLayout(merged, get().layoutSeed),
          tips: analyzeTips(merged),
          schemaDirty: true,
        });
      },

      markSchemaSaved: () => set({ schemaDirty: false }),

      setBuilderModel: (m) => {
        const next: QueryModel = normalizeQueryModel({
          ...m,
          updatedAt: new Date().toISOString(),
        });
        set({ builderModel: next, queryText: generateSql(next) });
      },

      newBuilderQuery: () => {
        const b = newEmptyQueryModel({ name: "New query" });
        set({
          builderModel: b,
          activeQueryId: null,
          queryText: generateSql(b),
        });
      },

      saveCurrentQuery: () => {
        const list = get().savedQueries.slice();
        const act = get().activeQueryId;
        const i = act ? list.findIndex((q) => q.id === act) : -1;
        if (i >= 0) {
          const b: QueryModel = {
            ...get().builderModel,
            id: act!,
            updatedAt: new Date().toISOString(),
          };
          list[i!] = b;
          set({
            savedQueries: list,
            builderModel: b,
            queryText: generateSql(b),
          });
        } else {
          const b: QueryModel = {
            ...get().builderModel,
            id: newQueryId(),
            name: get().builderModel.name || "Saved query",
            updatedAt: new Date().toISOString(),
          };
          list.push(b);
          set({
            savedQueries: list,
            activeQueryId: b.id,
            builderModel: b,
            queryText: generateSql(b),
          });
        }
      },

      updateActiveQuery: () => {
        const act = get().activeQueryId;
        if (!act) return;
        const b: QueryModel = {
          ...get().builderModel,
          id: act,
          updatedAt: new Date().toISOString(),
        };
        set({
          builderModel: b,
          savedQueries: get().savedQueries.map((q) =>
            q.id === act ? b : q
          ),
          queryText: generateSql(b),
        });
      },

      loadSavedQuery: (id) => {
        const q = get().savedQueries.find((x) => x.id === id);
        if (!q) return;
        set({
          builderModel: JSON.parse(JSON.stringify(q)) as QueryModel,
          activeQueryId: id,
          queryText: generateSql(q),
        });
      },

      deleteSavedQuery: (id) => {
        set({
          savedQueries: get().savedQueries.filter((q) => q.id !== id),
          activeQueryId:
            get().activeQueryId === id ? null : get().activeQueryId,
        });
      },

      duplicateSavedQuery: (id) => {
        const q = get().savedQueries.find((x) => x.id === id);
        if (!q) return;
        const c = cloneQueryModel(q, `${q.name} (copy)`);
        set({ savedQueries: [...get().savedQueries, c], activeQueryId: c.id, builderModel: c, queryText: generateSql(c) });
      },

      importSavedQueriesMerge: (queries) => {
        if (queries.length === 0) return;
        const byId = new Map(get().savedQueries.map((q) => [q.id, q] as const));
        for (const q of queries) {
          byId.set(q.id, { ...q });
        }
        set({ savedQueries: Array.from(byId.values()) });
      },

      setIncludeQueriesInExport: (v) => set({ includeQueriesInExport: v }),

      exportSavedQueriesAsJson: () => {
        return JSON.stringify(
          { version: 1, queries: get().savedQueries },
          null,
          2
        );
      },

      setPracticeStep: (lessonId, stepId, status) => {
        set({
          practiceProgress: {
            ...get().practiceProgress,
            [lessonId]: {
              ...get().practiceProgress[lessonId],
              [stepId]: status,
            },
          },
        });
      },

      setPracticeAnswer: (lessonId, stepId, sql) => {
        set({
          practiceAnswers: {
            ...get().practiceAnswers,
            [lessonId]: {
              ...get().practiceAnswers[lessonId],
              [stepId]: sql,
            },
          },
        });
      },
    }),
    {
      name: "3d-db:queries",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        savedQueries: s.savedQueries,
        includeQueriesInExport: s.includeQueriesInExport,
        practiceProgress: s.practiceProgress,
        practiceAnswers: s.practiceAnswers,
      }),
    }
  )
);
