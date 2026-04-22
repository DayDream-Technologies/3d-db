import { useMemo } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import type { Schema } from "@/model/schema";
import type { LayoutMap } from "@/layout/forceLayout";

function relatedKeys(schema: Schema, table: string, column: string): Set<string> {
  const key = (t: string, c: string) => `${t}.${c}`;
  const out = new Set<string>();
  out.add(key(table, column));
  const t = schema.tables.find((x) => x.name === table);
  const col = t?.columns.find((c) => c.name === column);
  if (col?.foreignKey) {
    out.add(key(col.foreignKey.table, col.foreignKey.column));
  }
  for (const tb of schema.tables) {
    for (const c of tb.columns) {
      if (c.foreignKey?.table === table && c.foreignKey.column === column) {
        out.add(key(tb.name, c.name));
      }
    }
  }
  return out;
}

type Props = {
  schema: Schema;
  layout: LayoutMap;
  hovered: { table: string; column: string } | null;
};

export function HoverEdges({ schema, layout, hovered }: Props) {
  const segments = useMemo(() => {
    if (!hovered) return [];
    const keys = relatedKeys(schema, hovered.table, hovered.column);
    const tablesInvolved = new Set<string>();
    for (const k of keys) {
      const dot = k.indexOf(".");
      if (dot > 0) tablesInvolved.add(k.slice(0, dot));
    }
    const names = [...tablesInvolved];
    const pts: THREE.Vector3[][] = [];
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const a = layout[names[i]];
        const b = layout[names[j]];
        if (!a || !b) continue;
        const va = new THREE.Vector3(...a);
        const vb = new THREE.Vector3(...b);
        pts.push([va, vb]);
      }
    }
    return pts;
  }, [schema, layout, hovered]);

  return (
    <>
      {segments.map((pair, i) => (
        <Line
          key={i}
          points={pair}
          color="#38bdf8"
          lineWidth={2}
          transparent
          opacity={0.65}
        />
      ))}
    </>
  );
}
