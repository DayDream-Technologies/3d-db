import type { Schema } from "@/model/schema";

const MIN_EDGE = 0.45;
const MAX_EDGE = 2.2;

export function getMaxRowCount(schema: Schema): number {
  let m = 1;
  for (const t of schema.tables) {
    const r = t.rowCount ?? 1;
    if (r > m) m = r;
  }
  return m;
}

export function rowCountPercentiles(schema: Schema): { p95: number; p99: number } {
  const arr = schema.tables
    .map((t) => t.rowCount ?? 0)
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  if (arr.length === 0) return { p95: 1, p99: 1 };
  const p95 = arr[Math.min(arr.length - 1, Math.floor(arr.length * 0.95))];
  const p99 = arr[Math.min(arr.length - 1, Math.floor(arr.length * 0.99))];
  return { p95: p95 || 1, p99: p99 || p95 || 1 };
}

export function cubeEdge(rowCount: number | undefined, maxRows: number): number {
  const rc = Math.max(1, rowCount ?? 1);
  const max = Math.max(1, maxRows);
  const t = Math.cbrt(rc) / Math.cbrt(max);
  return MIN_EDGE + t * (MAX_EDGE - MIN_EDGE);
}

export function bloatHex(
  rowCount: number | undefined,
  p95: number,
  p99: number
): string {
  const rc = rowCount ?? 0;
  if (rc <= 0) return "#64748b";
  if (rc >= p99) return "#ef4444";
  if (rc >= p95) return "#eab308";
  return "#22c55e";
}
