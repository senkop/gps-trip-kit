import { speedBetween } from "./geo.js";
import type { GpsPoint } from "./types.js";

export interface CleanOptions {
  /** Drop a point if reaching it from the last kept point needs a speed above this. Default 250 km/h. */
  maxSpeedKmh?: number;
  /** Drop points whose reported accuracy is worse than this many meters. Default: no limit. */
  maxAccuracy?: number;
}

/**
 * Sort by time, drop invalid coordinates, duplicate timestamps,
 * low-accuracy fixes, and "teleport" jumps that imply an impossible speed.
 * Returns a new array; the input is not modified.
 */
export function clean<P extends GpsPoint>(points: readonly P[], options: CleanOptions = {}): P[] {
  const maxSpeed = (options.maxSpeedKmh ?? 250) / 3.6;
  const maxAccuracy = options.maxAccuracy ?? Number.POSITIVE_INFINITY;

  const sorted = points
    .filter(
      (p) =>
        Number.isFinite(p.lat) &&
        Number.isFinite(p.lng) &&
        Number.isFinite(p.time) &&
        Math.abs(p.lat) <= 90 &&
        Math.abs(p.lng) <= 180 &&
        !(p.lat === 0 && p.lng === 0) &&
        (p.accuracy === undefined || p.accuracy <= maxAccuracy),
    )
    .sort((a, b) => a.time - b.time);

  const out: P[] = [];
  for (const p of sorted) {
    const last = out[out.length - 1];
    if (!last) {
      out.push(p);
      continue;
    }
    if (p.time === last.time) continue;
    if (speedBetween(last, p) > maxSpeed) continue;
    out.push(p);
  }
  return out;
}
