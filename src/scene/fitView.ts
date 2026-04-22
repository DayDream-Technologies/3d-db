import * as THREE from "three";
import type { LayoutMap } from "@/layout/forceLayout";

/**
 * Compute a camera position + look-at that frames every table in the layout.
 * Returns target (look-at) and position (camera) in world space.
 */
export function computeFitCamera(
  layout: LayoutMap,
  fovDeg = 48,
  padding = 1.4
): { target: THREE.Vector3; position: THREE.Vector3; radius: number } {
  const positions = Object.values(layout);
  if (positions.length === 0) {
    return {
      target: new THREE.Vector3(0, 0, 0),
      position: new THREE.Vector3(14, 10, 16),
      radius: 6,
    };
  }
  const box = new THREE.Box3();
  for (const p of positions) {
    box.expandByPoint(new THREE.Vector3(p[0], p[1], p[2]));
  }
  // Add a safety margin to account for box sizes + labels
  box.expandByScalar(2.0);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);
  const radius = Math.max(size.length() * 0.5, 3);
  const fov = THREE.MathUtils.degToRad(fovDeg);
  const dist = (radius / Math.sin(fov / 2)) * padding;
  const dir = new THREE.Vector3(0.55, 0.4, 0.75).normalize();
  return {
    target: center,
    position: center.clone().add(dir.multiplyScalar(dist)),
    radius,
  };
}
