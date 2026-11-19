import { distance } from "./geo.js";
import type { GpsPoint, TripSummary } from "./types.js";

export interface SummaryOptions {
  /** Speeds at or below this (km/h) count as idle. Default 3 km/h. */
  idleSpeedKmh?: number;
  /** Gaps longer than this (ms) are not counted as moving or idle time. Default 10 minutes. */
  maxGap?: number;
}

/** Distance, durations and speeds for a sequence of points sorted by time. */
export function summarize(points: readonly GpsPoint[], options: SummaryOptions = {}): TripSummary {
  const idleSpeed = (options.idleSpeedKmh ?? 3) / 3.6;
  const maxGap = options.maxGap ?? 10 * 60_000;

  let dist = 0;
  let moving = 0;
  let idle = 0;
  let maxSpeed = 0;

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dt = b.time - a.time;
    const d = distance(a, b);
    dist += d;
    if (dt <= 0 || dt > maxGap) continue;
    const v = d / (dt / 1000);
    if (v > maxSpeed) maxSpeed = v;
    if (v > idleSpeed) moving += dt;
    else idle += dt;
  }

  const duration = points.length > 1 ? points[points.length - 1].time - points[0].time : 0;
  return {
    distance: dist,
    duration,
    movingTime: moving,
    idleTime: idle,
    maxSpeed,
    avgSpeed: duration > 0 ? dist / (duration / 1000) : 0,
    avgMovingSpeed: moving > 0 ? dist / (moving / 1000) : 0,
  };
}
