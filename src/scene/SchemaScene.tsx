import { useMemo, useRef, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { inferRelationships } from "@/model/schema";
import type { Schema } from "@/model/schema";
import type { LayoutMap } from "@/layout/forceLayout";
import type { QueryHighlightResult } from "@/analysis/queryHighlight";
import { Table3D } from "./Table3D";
import { Relationship3D } from "./Relationship3D";
import { HoverEdges } from "./HoverEdges";
import { CameraRig, type CameraRigHandle } from "./CameraRig";

type Props = {
  schema: Schema;
  layout: LayoutMap;
  selectedTable: string | null;
  hoveredKey: { table: string; column: string } | null;
  queryHighlight: QueryHighlightResult | null;
  onSelectTable: (name: string) => void;
  onHoverKey: (k: { table: string; column: string } | null) => void;
  screenshotRef: React.MutableRefObject<(() => void) | null>;
  fitViewRef: React.MutableRefObject<(() => void) | null>;
  showKeys: boolean;
};

function edgeWeights(schema: Schema): Map<string, number> {
  const rels = inferRelationships(schema);
  const m = new Map<string, number>();
  for (const r of rels) {
    const a = r.fromTable < r.toTable ? r.fromTable : r.toTable;
    const b = r.fromTable < r.toTable ? r.toTable : r.fromTable;
    const k = `${a}|${b}`;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

export function SchemaScene({
  schema,
  layout,
  selectedTable,
  hoveredKey,
  queryHighlight,
  onSelectTable,
  onHoverKey,
  screenshotRef,
  fitViewRef,
  showKeys,
}: Props) {
  const rels = useMemo(() => inferRelationships(schema), [schema]);
  const weights = useMemo(() => edgeWeights(schema), [schema]);
  const { gl, scene, camera } = useThree();
  const rigRef = useRef<CameraRigHandle>(null);
  const didInitialFit = useRef(false);

  useEffect(() => {
    screenshotRef.current = () => {
      gl.render(scene, camera);
      const url = gl.domElement.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${schema.name.replace(/\s+/g, "_")}_3d.png`;
      a.click();
    };
    return () => {
      screenshotRef.current = null;
    };
  }, [gl, scene, camera, schema.name, screenshotRef]);

  useEffect(() => {
    fitViewRef.current = () => rigRef.current?.fitAll(layout);
    return () => {
      fitViewRef.current = null;
    };
  }, [layout, fitViewRef]);

  // Auto-fit on schema / layout change
  useEffect(() => {
    const keys = Object.keys(layout);
    if (keys.length === 0) return;
    const id = requestAnimationFrame(() => {
      rigRef.current?.fitAll(layout);
      didInitialFit.current = true;
    });
    return () => cancelAnimationFrame(id);
  }, [layout]);

  // Focus on click-selected table
  useEffect(() => {
    if (!selectedTable) return;
    const pos = layout[selectedTable];
    if (!pos) return;
    rigRef.current?.focusOn(pos);
  }, [selectedTable, layout]);

  const qhTables =
    queryHighlight?.ok && queryHighlight.tables.length > 0
      ? new Set(queryHighlight.tables)
      : null;

  return (
    <>
      <color attach="background" args={["#0b0f14"]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[12, 18, 8]} intensity={0.85} castShadow />
      <directionalLight position={[-10, 6, -6]} intensity={0.35} />
      <CameraRig ref={rigRef} />
      <HoverEdges schema={schema} layout={layout} hovered={hoveredKey} />
      {rels.map((r) => {
        const a = r.fromTable < r.toTable ? r.fromTable : r.toTable;
        const b = r.fromTable < r.toTable ? r.toTable : r.fromTable;
        const w = weights.get(`${a}|${b}`) ?? 1;
        const qh = queryHighlight;
        const joinHit =
          qh?.ok &&
          qh.joins.some(
            (j) =>
              (j.left === r.fromTable && j.right === r.toTable) ||
              (j.left === r.toTable && j.right === r.fromTable)
          );
        const tableHit =
          qhTables &&
          (qhTables.has(r.fromTable) || qhTables.has(r.toTable));
        const highlight = !!(joinHit || (qhTables && tableHit));
        const dim =
          !!qhTables &&
          !qhTables.has(r.fromTable) &&
          !qhTables.has(r.toTable);
        return (
          <Relationship3D
            key={r.id}
            rel={r}
            layout={layout}
            highlight={highlight}
            dim={dim}
            weight={w}
          />
        );
      })}
      {schema.tables.map((t) => {
        const pos = layout[t.name];
        if (!pos) return null;
        const queryDim = !!qhTables && !qhTables.has(t.name);
        const queryHl = !!qhTables && qhTables.has(t.name);
        return (
          <Table3D
            key={t.name}
            table={t}
            position={pos}
            schema={schema}
            selected={selectedTable === t.name}
            queryFilterActive={qhTables !== null}
            queryDim={queryDim}
            queryHighlight={queryHl}
            showKeys={showKeys}
            hoveredKey={hoveredKey}
            onSelectTable={onSelectTable}
            onHoverKey={onHoverKey}
          />
        );
      })}
    </>
  );
}
