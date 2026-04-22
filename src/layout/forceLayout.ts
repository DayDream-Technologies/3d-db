/** Deterministic 3D force-directed layout (seeded) */

export type Vec3 = [number, number, number];
export type LayoutMap = Record<string, Vec3>;

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function vecSub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vecLen(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

function vecNorm(v: Vec3): Vec3 {
  const l = vecLen(v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function vecScale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function vecAdd(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/**
 * @param nodes table names
 * @param edges undirected pairs for attraction
 */
export function computeForceLayout3D(
  nodes: string[],
  edges: [string, string][],
  seed = 42,
  opts?: { iterations?: number; repulsion?: number; attraction?: number }
): LayoutMap {
  const iterations = opts?.iterations ?? 120;
  const kRep = opts?.repulsion ?? 2.2;
  const kAtt = opts?.attraction ?? 0.08;
  const rand = mulberry32(seed);

  const pos: Record<string, Vec3> = {};
  for (const n of nodes) {
    pos[n] = [
      (rand() - 0.5) * 8,
      (rand() - 0.5) * 8,
      (rand() - 0.5) * 8,
    ];
  }

  const dt = 0.35;

  for (let it = 0; it < iterations; it++) {
    const forces: Record<string, Vec3> = {};
    for (const n of nodes) forces[n] = [0, 0, 0];

    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const d = vecSub(pos[a], pos[b]);
        let dist = vecLen(d);
        if (dist < 0.01) dist = 0.01;
        const dir = vecNorm(d);
        const f = kRep / (dist * dist);
        const push = vecScale(dir, f);
        forces[a] = vecAdd(forces[a], push);
        forces[b] = vecSub(forces[b], push);
      }
    }

    // Attraction along edges
    for (const [a, b] of edges) {
      const d = vecSub(pos[b], pos[a]);
      const dist = vecLen(d) || 0.01;
      const dir = vecNorm(d);
      const f = kAtt * (dist - 3) * (1 + it / iterations);
      const pull = vecScale(dir, f);
      forces[a] = vecAdd(forces[a], pull);
      forces[b] = vecSub(forces[b], pull);
    }

    // Weak pull to center (stability)
    for (const n of nodes) {
      const toCenter = vecScale(vecNorm(vecSub([0, 0, 0], pos[n])), 0.02);
      forces[n] = vecAdd(forces[n], toCenter);
    }

    for (const n of nodes) {
      pos[n] = vecAdd(pos[n], vecScale(forces[n], dt));
    }

    // Cooling
    // (implicit in attraction scaling)
  }

  // Center graph
  let cx = 0,
    cy = 0,
    cz = 0;
  for (const n of nodes) {
    cx += pos[n][0];
    cy += pos[n][1];
    cz += pos[n][2];
  }
  const inv = nodes.length ? 1 / nodes.length : 1;
  cx *= inv;
  cy *= inv;
  cz *= inv;

  const out: LayoutMap = {};
  for (const n of nodes) {
    out[n] = [pos[n][0] - cx, pos[n][1] - cy, pos[n][2] - cz];
  }

  return out;
}
