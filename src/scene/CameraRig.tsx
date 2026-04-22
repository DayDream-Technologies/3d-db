import { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { LayoutMap } from "@/layout/forceLayout";
import { computeFitCamera } from "./fitView";

export type CameraRigHandle = {
  /** Animate camera + target to frame all tables in the layout */
  fitAll: (layout: LayoutMap) => void;
  /** Animate toward a world point (e.g. a table center) */
  focusOn: (pos: [number, number, number]) => void;
};

/**
 * Camera rig that:
 * - Runs a short tween on an explicit command (focusOn / fitAll)
 * - Stops immediately when the user rotates / pans / zooms
 * - Otherwise does not touch the camera, so rotate / pan / zoom are fully free
 */
export const CameraRig = forwardRef<CameraRigHandle>(function CameraRig(
  _props,
  ref
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const animating = useRef(false);
  const goalTarget = useRef(new THREE.Vector3(0, 0, 0));
  const goalPos = useRef(camera.position.clone());

  useEffect(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    const cancel = () => {
      animating.current = false;
    };
    ctrl.addEventListener("start", cancel);
    return () => ctrl.removeEventListener("start", cancel);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      focusOn(pos) {
        const ctrl = controlsRef.current;
        if (!ctrl) return;
        const f = new THREE.Vector3(pos[0], pos[1], pos[2]);
        goalTarget.current.copy(f);
        const currentOffset = camera.position.clone().sub(ctrl.target);
        const dist = THREE.MathUtils.clamp(currentOffset.length(), 8, 16);
        const dir =
          currentOffset.lengthSq() > 0
            ? currentOffset.normalize()
            : new THREE.Vector3(0.55, 0.45, 0.7).normalize();
        goalPos.current.copy(f.clone().add(dir.multiplyScalar(dist)));
        animating.current = true;
      },
      fitAll(layout) {
        const ctrl = controlsRef.current;
        if (!ctrl) return;
        const fit = computeFitCamera(layout);
        goalTarget.current.copy(fit.target);
        goalPos.current.copy(fit.position);
        animating.current = true;
      },
    }),
    [camera]
  );

  useFrame(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    if (!animating.current) return;
    ctrl.target.lerp(goalTarget.current, 0.12);
    camera.position.lerp(goalPos.current, 0.1);
    if (
      ctrl.target.distanceToSquared(goalTarget.current) < 0.0005 &&
      camera.position.distanceToSquared(goalPos.current) < 0.001
    ) {
      ctrl.target.copy(goalTarget.current);
      camera.position.copy(goalPos.current);
      animating.current = false;
    }
    ctrl.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan
      enableRotate
      enableZoom
      zoomSpeed={1.1}
      rotateSpeed={0.9}
      panSpeed={0.9}
      screenSpacePanning
      minDistance={2}
      maxDistance={140}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }}
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
    />
  );
});
