import type { LatLng } from "./types.js";

const M_PER_DEG = 111_320;

/**
 * Douglas–Peucker simplification with the tolerance in meters.
 * Keeps the first and last point and preserves the original objects (and their extra fields).
 * Iterative, so it is safe on very long tracks.
 */
export function simplify<P extends LatLng>(points: readonly P[], tolerance = 10): P[] {
  if (points.length <= 2) return points.slice();

  // Project to a local flat plane in meters around the mean latitude.
  const meanLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const kx = M_PER_DEG * Math.cos((meanLat * Math.PI) / 180);
  const xs = points.map((p) => p.lng * kx);
  const ys = points.map((p) => p.lat * M_PER_DEG);

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const tol2 = tolerance * tolerance;
  const stack: [number, number][] = [[0, points.length - 1]];

  while (stack.length) {
    const [a, b] = stack.pop()!;
    let maxD = -1;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = segDist2(xs[i], ys[i], xs[a], ys[a], xs[b], ys[b]);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx !== -1 && maxD > tol2) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => keep[i] === 1);
}

function segDist2(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const ex = ax + t * dx - px;
  const ey = ay + t * dy - py;
  return ex * ex + ey * ey;
}
