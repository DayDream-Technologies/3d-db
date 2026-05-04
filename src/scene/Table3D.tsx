import { useMemo } from "react";
import { Html, Text } from "@react-three/drei";
import type { Schema, Table } from "@/model/schema";
import { bloatHex, cubeEdge, getMaxRowCount, rowCountPercentiles } from "./tableScale";
import type { ProposalTableVisualStatus } from "@/export/proposalTableStatus";
import clsx from "clsx";

type Props = {
  table: Table;
  position: [number, number, number];
  schema: Schema;
  selected: boolean;
  queryFilterActive: boolean;
  queryDim: boolean;
  queryHighlight: boolean;
  showKeys: boolean;
  hoveredKey: { table: string; column: string } | null;
  onSelectTable: (name: string) => void;
  onHoverKey: (k: { table: string; column: string } | null) => void;
  proposalStatus: ProposalTableVisualStatus | null;
};

function relatedColumns(
  schema: Schema,
  table: string,
  column: string
): Set<string> {
  const key = (t: string, c: string) => `${t}.${c}`;
  const out = new Set<string>();
  out.add(key(table, column));
  const t = schema.tables.find((x) => x.name === table);
  if (!t) return out;
  const col = t.columns.find((c) => c.name === column);
  if (col?.foreignKey) {
    out.add(key(col.foreignKey.table, col.foreignKey.column));
  }
  for (const tb of schema.tables) {
    for (const c of tb.columns) {
      if (
        c.foreignKey?.table === table &&
        c.foreignKey.column === column
      ) {
        out.add(key(tb.name, c.name));
      }
    }
  }
  return out;
}

export function Table3D({
  table,
  position,
  schema,
  selected,
  queryFilterActive,
  queryDim,
  queryHighlight,
  showKeys,
  hoveredKey,
  onSelectTable,
  onHoverKey,
  proposalStatus,
}: Props) {
  const maxRows = useMemo(() => getMaxRowCount(schema), [schema]);
  const { p95, p99 } = useMemo(() => rowCountPercentiles(schema), [schema]);
  const edge = cubeEdge(table.rowCount, maxRows);
  const bloatColor = bloatHex(table.rowCount, p95, p99);
  const color =
    proposalStatus === "added"
      ? "#22c55e"
      : proposalStatus === "modified"
        ? "#f59e0b"
        : bloatColor;
  const highlightKeys = useMemo(() => {
    if (!hoveredKey) return null;
    return relatedColumns(schema, hoveredKey.table, hoveredKey.column);
  }, [hoveredKey, schema]);

  const opacity = queryFilterActive
    ? queryDim
      ? 0.2
      : queryHighlight
        ? 1
        : 0.45
    : 1;
  const emissive = selected
    ? "#0ea5e9"
    : proposalStatus === "added"
      ? "#166534"
      : proposalStatus === "modified"
        ? "#92400e"
        : "#000000";

  return (
    <group position={position}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelectTable(table.name);
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        <boxGeometry args={[edge, edge * 0.55, edge]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={
            selected ? 0.35 : proposalStatus === "added" ? 0.28 : proposalStatus === "modified" ? 0.22 : 0
          }
          metalness={0.2}
          roughness={0.65}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
      <Text
        position={[0, edge * 0.35 + 0.35, 0]}
        fontSize={0.28}
        color="#f1f5f9"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.02}
        outlineColor="#0f172a"
      >
        {`${table.name} · ${(table.rowCount ?? "?").toLocaleString?.() ?? "?"} rows`}
      </Text>
      {showKeys && (
      <Html
        transform
        occlude={false}
        position={[0, -edge * 0.35 - 0.05, edge * 0.35]}
        style={{ width: 220, pointerEvents: "none" }}
      >
        <div className="pointer-events-auto rounded border border-slate-600/80 bg-slate-900/95 p-1.5 text-[10px] text-slate-200 shadow-lg backdrop-blur"
          onPointerDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="mb-0.5 text-[9px] uppercase tracking-wide text-slate-500">
            Keys
          </div>
          <div className="flex flex-wrap gap-0.5">
            {table.columns.map((c) => {
              const k = `${table.name}.${c.name}`;
              const isHl =
                highlightKeys?.has(k) ||
                (hoveredKey?.table === table.name &&
                  hoveredKey.column === c.name);
              return (
                <button
                  type="button"
                  key={c.name}
                  className={clsx(
                    "rounded px-1 py-0.5 font-mono transition-colors",
                    c.primaryKey && "ring-1 ring-amber-400/70",
                    c.foreignKey && "ring-1 ring-sky-500/60",
                    isHl
                      ? "bg-sky-600/90 text-white"
                      : "bg-slate-800/90 hover:bg-slate-700"
                  )}
                  onPointerEnter={() => onHoverKey({ table: table.name, column: c.name })}
                  onPointerLeave={() => onHoverKey(null)}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      </Html>
      )}
    </group>
  );
}
