import { centroid, distance } from "./geo.js";
import type { GpsPoint, Stop } from "./types.js";

export interface StopOptions {
  /** Max distance in meters from the first point of a stay. Default 60. */
  radius?: number;
  /** Minimum stay in milliseconds to count as a stop. Default 3 minutes. */
  minDuration?: number;
}

/**
 * Stay-point detection: finds places where the device stayed within `radius`
 * meters for at least `minDuration`. Expects points sorted by time (run `clean` first).
 */
export function detectStops(points: readonly GpsPoint[], options: StopOptions = {}): Stop[] {
  const radius = options.radius ?? 60;
  const minDuration = options.minDuration ?? 3 * 60_000;
  const stops: Stop[] = [];

  let i = 0;
  while (i < points.length) {
    let j = i + 1;
    while (j < points.length && distance(points[i], points[j]) <= radius) j++;
    const last = j - 1;
    const duration = points[last].time - points[i].time;
    if (last > i && duration >= minDuration) {
      const c = centroid(points.slice(i, j));
      stops.push({
        ...c,
        start: points[i].time,
        end: points[last].time,
        duration,
        startIndex: i,
        endIndex: last,
      });
      i = j;
    } else {
      i++;
    }
  }
  return stops;
}
