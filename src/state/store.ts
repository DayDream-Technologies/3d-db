import { create } from "zustand";
import type { Schema } from "@/model/schema";
import { inferRelationships, mergeRowCounts } from "@/model/schema";
import { computeForceLayout3D, type LayoutMap } from "@/layout/forceLayout";
import { analyzeTips, type Tip } from "@/analysis/tips";
import {
  parseSelectQuery,
  type QueryHighlightResult,
} from "@/analysis/queryHighlight";
import { parseJsonSchema } from "@/parsers/jsonSchema";
import { parseSqlSchema } from "@/parsers/sqlSchema";

export type SidebarTab =
  | "import"
  | "table"
  | "query"
  | "tips"
  | "export";

export type ImportMode = "json" | "sql";

type AppState = {
  /** Imported schema before row-count overrides */
  rawSchema: Schema | null;
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
  /** Show the per-table column chip overlay in 3D */
  showKeys: boolean;

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

export const useAppStore = create<AppState>((set, get) => ({
  rawSchema: null,
  schema: null,
  layout: {},
  rowCountOverrides: {},
  selectedTable: null,
  hoveredKey: null,
  sidebarTab: "import",
  importMode: "json",
  importText: "",
  layoutSeed: 42,
  queryText: "",
  queryHighlight: null,
  tips: [],
  showKeys: true,

  setImportMode: (m) => set({ importMode: m }),
  setImportText: (t) => set({ importText: t }),
  setSidebarTab: (t) => set({ sidebarTab: t }),
  setSchema: (schema) => {
    if (!schema) {
      set({
        rawSchema: null,
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
      schema: merged,
      layout,
      tips: analyzeTips(merged),
      queryHighlight: null,
    });
  },

  applyImport: () => {
    const { importText, importMode } = get();
    const raw =
      importMode === "json"
        ? parseJsonSchema(importText)
        : parseSqlSchema(importText);
    set({ rowCountOverrides: {}, layoutSeed: 42 });
    const merged = applyOverrides(raw, {});
    const layout = buildLayout(merged, 42);
    set({
      rawSchema: raw,
      schema: merged,
      layout,
      tips: analyzeTips(merged),
      queryHighlight: null,
      sidebarTab: "tips",
    });
  },

  loadSample: async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}`);
    const text = await res.text();
    const raw = parseJsonSchema(text);
    set({
      importText: text,
      importMode: "json",
      rowCountOverrides: {},
      layoutSeed: 42,
    });
    const merged = applyOverrides(raw, {});
    const layout = buildLayout(merged, 42);
    set({
      rawSchema: raw,
      schema: merged,
      layout,
      tips: analyzeTips(merged),
      queryHighlight: null,
      sidebarTab: "import",
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
}));

