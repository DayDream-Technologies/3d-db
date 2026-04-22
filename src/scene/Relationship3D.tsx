import { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import type { Relationship } from "@/model/schema";
import type { LayoutMap } from "@/layout/forceLayout";

type Props = {
  rel: Relationship;
  layout: LayoutMap;
  highlight: boolean;
  dim: boolean;
  weight?: number;
};

export function Relationship3D({
  rel,
  layout,
  highlight,
  dim,
  weight = 1,
}: Props) {
  const points = useMemo(() => {
    const a = layout[rel.fromTable];
    const b = layout[rel.toTable];
    if (!a || !b) return [];
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const mid = va.clone().add(vb).multiplyScalar(0.5);
    mid.y += 1.2 + Math.min(2, weight * 0.15);
    const curve = new THREE.QuadraticBezierCurve3(va, mid, vb);
    return curve.getPoints(48);
  }, [layout, rel.fromTable, rel.toTable, weight]);

  if (points.length < 2) return null;

  const color = highlight ? "#38bdf8" : dim ? "#334155" : "#475569";
  const opacity = dim ? 0.15 : highlight ? 1 : 0.55;

  return (
    <Line
      points={points}
      color={color}
      lineWidth={highlight ? 3 : 2}
      transparent
      opacity={opacity}
    />
  );
}
